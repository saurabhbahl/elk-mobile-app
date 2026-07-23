import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { safeStorage as AsyncStorage } from '../utils/asyncStorage';

const BASE_URL = process.env.EXPO_PUBLIC_MBTILES_URL ? process.env.EXPO_PUBLIC_MBTILES_URL.replace(/\/elk-vector\.mbtiles$/, '') : '';

export const MBTILES_FILES = [
  'elk-vector.mbtiles',
  'asia_india.mbtiles'
];

const docDir = FileSystem.documentDirectory || '';

export const MBTILES_PATHS = MBTILES_FILES.map(filename => {
  const uri = docDir + filename;
  return {
    name: filename,
    path: uri.replace('file://', ''),
    uri: uri
  };
});

export const MBTILES_FILE_PATH = MBTILES_PATHS[0].path;
export const SECONDARY_MBTILES_FILE_PATH = MBTILES_PATHS[1].path;

const isExpoGo = Constants.appOwnership === 'expo';
const CONSENT_KEY = 'MAP_DOWNLOAD_CONSENT';

export const useOfflineMap = () => {
  const [hasMap, setHasMap] = useState(false);
  const [mbtilesError, setMbtilesError] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [consentStatus, setConsentStatus] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const checkMapStatus = useCallback(async () => {
    try {
      let allExist = true;
      for (const file of MBTILES_PATHS) {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (!fileInfo.exists) {
          allExist = false;
          break;
        }
      }
      setHasMap(allExist);
      return allExist;
    } catch (e) {
      console.log('Error checking map files', e);
      return false;
    }
  }, []);

  const loadConsent = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CONSENT_KEY);
      setConsentStatus(stored);
    } catch (e) {
      console.log('Error loading consent', e);
    }
  }, []);

  const saveConsent = async (status: 'yes' | 'no' | 'dismissed') => {
    try {
      await AsyncStorage.setItem(CONSENT_KEY, status);
      setConsentStatus(status);
    } catch (e) {
      console.log('Error saving consent', e);
    }
  };

  const downloadMap = async () => {
    if (isExpoGo) {
      console.log('Download aborted: Expo Go does not support custom MBTiles');
      return;
    }

    if (!BASE_URL) {
      console.error('Download aborted: MBTILES_URL is not defined in .env');
      setMbtilesError(true);
      return;
    }

    try {
      setIsDownloading(true);
      setMbtilesError(false);
      setDownloadProgress(0);

      let completedDownloads = 0;

      for (let i = 0; i < MBTILES_PATHS.length; i++) {
        const file = MBTILES_PATHS[i];
        const fileInfo = await FileSystem.getInfoAsync(file.uri);

        if (fileInfo.exists) {
          console.log(`${file.name} already exists, skipping...`);
          completedDownloads++;
          continue;
        }

        const downloadUrl = `${BASE_URL}/${file.name}`;
        console.log(`Downloading ${file.name} from: ${downloadUrl}`);

        const downloadResumable = FileSystem.createDownloadResumable(
          downloadUrl,
          file.uri,
          {},
          (progress) => {
            if (progress.totalBytesExpectedToWrite > 0) {
              const filePercent = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
              const overallPercent = (completedDownloads + filePercent) / MBTILES_PATHS.length;
              setDownloadProgress(overallPercent);
            }
          }
        );

        const result = await downloadResumable.downloadAsync();
        if (result && result.status === 200) {
          completedDownloads++;
        } else {
          throw new Error(`Download failed with status ${result?.status}`);
        }
      }

      const allExist = await checkMapStatus();
      if (allExist) {
        setHasMap(true);
        setDownloadProgress(1);
      } else {
        throw new Error('Downloads finished but some files are still missing');
      }

    } catch (error) {
      console.error('Error downloading maps:', error);
      setMbtilesError(true);
      setDownloadProgress(0);
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteMap = async () => {
    try {
      for (const file of MBTILES_PATHS) {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(file.uri);
        }
      }
      setHasMap(false);
      setDownloadProgress(0);
      console.log('Maps deleted successfully');
    } catch (error) {
      console.log('Error deleting maps', error);
    }
  };

  useEffect(() => {
    (async () => {
      setIsInitializing(true);
      await loadConsent();
      const mapExists = await checkMapStatus();

      if (!mapExists && !isExpoGo) {
        const storedConsent = await AsyncStorage.getItem(CONSENT_KEY);
        if (storedConsent === 'yes') {
          await downloadMap();
        }
      }

      setIsInitializing(false);
    })();
  }, [checkMapStatus, loadConsent]);

  return {
    hasMap,
    mbtilesError,
    isExpoGo,
    downloadProgress,
    isDownloading,
    consentStatus,
    saveConsent,
    downloadMap,
    deleteMap,
    checkMapStatus,
    isInitializing
  };
};

