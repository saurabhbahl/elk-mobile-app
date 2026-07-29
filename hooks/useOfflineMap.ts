import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState, useRef } from 'react';
import { safeStorage as AsyncStorage } from '../utils/asyncStorage';

const BASE_URL = process.env.EXPO_PUBLIC_MBTILES_URL
  ? process.env.EXPO_PUBLIC_MBTILES_URL.replace(/\/elk-vector\.mbtiles$/, '')
  : '';

export const MBTILES_FILES = [
  'elk-vector.mbtiles',
];

const docDir = FileSystem.documentDirectory || '';

export const MBTILES_PATHS = MBTILES_FILES.map(filename => {
  const uri = docDir + filename;
  return {
    name: filename,
    path: uri.replace('file://', ''),
    uri: uri,
  };
});

export const MBTILES_FILE_PATH = MBTILES_PATHS[0].path;
// Fallback secondary path reuses primary to avoid crashes when only 1 file is present
export const SECONDARY_MBTILES_FILE_PATH = MBTILES_PATHS[0].path;

const isExpoGo = Constants.appOwnership === 'expo';
const CONSENT_KEY = 'MAP_DOWNLOAD_CONSENT';

/** Check if a file at the given URI is a valid SQLite/MBTiles database and not empty */
async function isValidMbtiles(uri: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size < 1024 * 1024) {
      // If it's smaller than 1MB, it's definitely incomplete/corrupt
      return false;
    }

    const header = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 16,
      position: 0,
    });
    const decoded = atob(header);
    return decoded.startsWith('SQLite format 3');
  } catch {
    return false;
  }
}

export const useOfflineMap = () => {
  const [hasMap, setHasMap] = useState(false);
  const [mbtilesError, setMbtilesError] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [consentStatus, setConsentStatus] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [downloadedMapFiles, setDownloadedMapFiles] = useState<string[]>([]);
  const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null);

  const checkMapStatus = useCallback(async () => {
    try {
      // Use dynamically saved list if available, else fall back to static list
      let expectedFiles = MBTILES_PATHS;
      try {
        const storedList = await AsyncStorage.getItem('@elk_downloaded_maps');
        if (storedList) {
          const filenames = JSON.parse(storedList);
          if (Array.isArray(filenames)) {
            expectedFiles = filenames.map((name: string) => ({ uri: docDir + name } as { uri: string }));
          }
        }
      } catch (e) {}

      let allExist = true;
      const existingFiles: string[] = [];

      for (const file of expectedFiles) {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (!fileInfo.exists) {
          allExist = false;
          break;
        }
        // Validate it's actually a SQLite/MBTiles file, not a cached error page
        const valid = await isValidMbtiles(file.uri);
        if (!valid) {
          console.warn(`${file.uri} exists but is not a valid MBTiles database. Deleting corrupted file.`);
          await FileSystem.deleteAsync(file.uri, { idempotent: true });
          allExist = false;
          break;
        }
        existingFiles.push(file.uri.replace('file://', ''));
      }

      setDownloadedMapFiles(allExist ? existingFiles : []);
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

  const saveConsent = async (status: 'yes' | 'no' | 'dismissed', persist: boolean = true) => {
    try {
      if (persist) {
        await AsyncStorage.setItem(CONSENT_KEY, status);
      }
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

      // Try to fetch dynamic list from WP API
      let filesToDownload = MBTILES_PATHS.map(f => ({ ...f, downloadUrl: `${BASE_URL}/${f.name}` }));
      try {
        const wpBase = BASE_URL.replace(/\/map-download\/?$/, '');
        // Add a timestamp to bypass aggressive WordPress/Cloudflare REST API caching
        const listRes = await fetch(`${wpBase}/map-files?t=${Date.now()}`);
        if (listRes.ok) {
          const remoteFiles = await listRes.json();
          if (Array.isArray(remoteFiles)) {
            if (remoteFiles.length === 0) {
              console.log('Server explicitly returned 0 maps. Going online-only mode.');
              await AsyncStorage.setItem('@elk_downloaded_maps', '[]');
              setHasMap(false);
              setDownloadedMapFiles([]);
              setIsDownloading(false);
              return;
            }
            filesToDownload = remoteFiles.map(rf => ({
              name: rf.filename,
              path: docDir.replace('file://', '') + rf.filename,
              uri: docDir + rf.filename,
              downloadUrl: rf.url,
            }));
            await AsyncStorage.setItem(
              '@elk_downloaded_maps',
              JSON.stringify(remoteFiles.map((rf: { filename: string, url: string }) => rf.filename))
            );
          }
        }
      } catch (e) {
        console.log('Failed to fetch dynamic map list, falling back to hardcoded list', e);
      }

      let completedDownloads = 0;

      for (let i = 0; i < filesToDownload.length; i++) {
        const file = filesToDownload[i];
        const fileInfo = await FileSystem.getInfoAsync(file.uri);

        if (fileInfo.exists) {
          // Validate the existing file is a real MBTiles database, not a cached error page
          const valid = await isValidMbtiles(file.uri);
          if (valid) {
            console.log(`${file.name} already exists and is valid, skipping...`);
            completedDownloads++;
            continue;
          } else {
            console.warn(`${file.name} exists but is NOT a valid MBTiles database. Deleting and re-downloading...`);
            await FileSystem.deleteAsync(file.uri, { idempotent: true });
          }
        }

        const tmpUri = file.uri + '.tmp';
        console.log(`Downloading ${file.name} from: ${file.downloadUrl} to temporary file ${tmpUri}`);

        // Delete any leftover temporary file
        const tmpInfo = await FileSystem.getInfoAsync(tmpUri);
        if (tmpInfo.exists) {
          await FileSystem.deleteAsync(tmpUri, { idempotent: true });
        }

        const downloadResumable = FileSystem.createDownloadResumable(
          file.downloadUrl,
          tmpUri,
          {},
          (progress) => {
            if (progress.totalBytesExpectedToWrite > 0) {
              const filePercent = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
              const overallPercent = (completedDownloads + filePercent) / filesToDownload.length;
              setDownloadProgress(overallPercent);
            }
          }
        );

        downloadResumableRef.current = downloadResumable;
        const result = await downloadResumable.downloadAsync();
        if (result && result.status === 200) {
          // Validate downloaded file is a real SQLite/MBTiles database and not empty
          const valid = await isValidMbtiles(tmpUri);
          const finalInfo = await FileSystem.getInfoAsync(tmpUri);
          
          // An MBTiles file should be at least a few MBs. If it's less than 1MB, it's likely an error page or corrupt.
          const isLargeEnough = finalInfo.exists && finalInfo.size > 1024 * 1024;

          if (!valid || !isLargeEnough) {
            await FileSystem.deleteAsync(tmpUri, { idempotent: true });
            throw new Error(
              `Downloaded file "${file.name}" is not a valid MBTiles database or is too small.\n` +
              `The server may be returning an error page instead of the file.\n` +
              `Check: ${file.downloadUrl}`
            );
          }
          
          // Rename the tmp file to the final destination ONLY when 100% complete and valid
          await FileSystem.moveAsync({
            from: tmpUri,
            to: file.uri,
          });
          
          completedDownloads++;
        } else {
          // Clean up failed temp file
          await FileSystem.deleteAsync(tmpUri, { idempotent: true });
          throw new Error(`Download failed with HTTP status ${result?.status}`);
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
      if (error?.message && error.message.toLowerCase().includes('cancel')) {
        console.log('Download was cancelled.');
      } else {
        console.warn('Error downloading maps:', error);
        setMbtilesError(true);
      }
      setDownloadProgress(0);
    } finally {
      downloadResumableRef.current = null;
      setIsDownloading(false);
    }
  };

  const cancelDownload = async () => {
    try {
      if (downloadResumableRef.current) {
        await downloadResumableRef.current.cancelAsync();
      }
    } catch (e) {
      console.log('Error cancelling download', e);
    }
    // Delete any partially downloaded map tiles to prevent corruption
    await deleteMap();
  };

  const deleteMap = async () => {
    try {
      // Delete all dynamically tracked files
      let filesToDelete = MBTILES_PATHS.map(f => f.uri);
      try {
        const storedList = await AsyncStorage.getItem('@elk_downloaded_maps');
        if (storedList) {
          const filenames = JSON.parse(storedList);
          if (Array.isArray(filenames) && filenames.length > 0) {
            filesToDelete = filenames.map((name: string) => docDir + name);
          }
        }
      } catch (e) {}

      for (const uri of filesToDelete) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(uri);
        }
      }

      await AsyncStorage.removeItem('@elk_downloaded_maps');
      setHasMap(false);
      setDownloadedMapFiles([]);
      setDownloadProgress(0);
      setConsentStatus(null);
      await AsyncStorage.removeItem(CONSENT_KEY);
      console.log('Maps and consent deleted successfully');
    } catch (error) {
      console.log('Error deleting maps', error);
    }
  };

  useEffect(() => {
    (async () => {
      setIsInitializing(true);
      await loadConsent();
      await checkMapStatus();
      // Do NOT auto-download here — the consent modal in the UI must be shown
      // and the user must explicitly agree before downloading starts.
      setIsInitializing(false);
    })();

    // Cleanup: If the user navigates away while downloading, cancel it and clean up corrupted files
    return () => {
      if (downloadResumableRef.current) {
        downloadResumableRef.current.cancelAsync().catch(() => {});
        // Fire and forget delete of partial files
        deleteMap().catch(() => {});
      }
    };
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
    cancelDownload,
    deleteMap,
    setMbtilesError,
    checkMapStatus,
    isInitializing,
    downloadedMapFiles,
  };
};
