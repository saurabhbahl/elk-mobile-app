import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
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

let dismissedSession = false;
let isAnyDownloadActive = false;

// Global state variables for useOfflineMap hook instances to share progress
let globalHasMap = false;
let globalMbtilesError = false;
let globalDownloadProgress = 0;
let globalIsDownloading = false;
let globalIsPaused = false;
let globalDownloadedMapFiles: string[] = [];

let globalDownloadResumable: FileSystem.DownloadResumable | null = null;
let globalActiveDownloadingFile: string | null = null;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

import * as SQLite from 'expo-sqlite';

/** Check if a file at the given URI is a valid SQLite/MBTiles database and not empty */
async function isValidMbtiles(uri: string): Promise<boolean> {
  let tempDb: SQLite.SQLiteDatabase | null = null;
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size < 1024 * 1024) {
      // If it's smaller than 1MB, it's definitely incomplete/corrupt
      return false;
    }

    const cleanPath = uri.replace('file://', '');
    tempDb = SQLite.openDatabaseSync(cleanPath);
    tempDb.execSync('SELECT count(*) FROM sqlite_master;');
    return true;
  } catch (e) {
    console.warn(`[useOfflineMap] MBTiles database validation failed for ${uri}:`, e);
    return false;
  } finally {
    if (tempDb) {
      try {
        tempDb.closeSync();
      } catch {}
    }
  }
}

/** Check if the remote server supports HTTP Range requests */
async function checkRangeSupport(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.status === 206;
  } catch (e) {
    console.log('Failed to check range support, assuming false:', e);
    return false;
  }
}

/** Check if the local map file version differs from the remote server version */
function isMapFileOutdated(
  local: { url: string; modified_at?: string } | null | undefined,
  remote: { url: string; modified_at?: string }
): boolean {
  if (!local) return true;
  if (remote.modified_at && local.modified_at) {
    return new Date(remote.modified_at).getTime() > new Date(local.modified_at).getTime();
  }
  return local.url !== remote.url;
}

export const useOfflineMap = () => {
  const [isPaused, setIsPausedState] = useState(globalIsPaused);
  const [hasMap, setHasMapState] = useState(globalHasMap);
  const [mbtilesError, setMbtilesErrorState] = useState(globalMbtilesError);
  const [downloadProgress, setDownloadProgressState] = useState(globalDownloadProgress);
  const [isDownloading, setIsDownloadingState] = useState(globalIsDownloading);
  const [consentStatus, setConsentStatus] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [downloadedMapFiles, setDownloadedMapFilesState] = useState(globalDownloadedMapFiles);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Helper setters that write to global variables and emit updates to all listeners
  const setHasMap = (val: boolean) => {
    globalHasMap = val;
    emit();
  };
  const setMbtilesError = (val: boolean) => {
    globalMbtilesError = val;
    emit();
  };
  const setDownloadProgress = (val: number) => {
    globalDownloadProgress = val;
    emit();
  };
  const setIsDownloading = (val: boolean) => {
    globalIsDownloading = val;
    emit();
  };
  const setIsPaused = (val: boolean) => {
    globalIsPaused = val;
    emit();
  };
  const setDownloadedMapFiles = (val: string[]) => {
    globalDownloadedMapFiles = val;
    emit();
  };

  // Subscribe to store updates on mount
  useEffect(() => {
    const handleStoreChange = () => {
      setIsPausedState(globalIsPaused);
      setHasMapState(globalHasMap);
      setMbtilesErrorState(globalMbtilesError);
      setDownloadProgressState(globalDownloadProgress);
      setIsDownloadingState(globalIsDownloading);
      setDownloadedMapFilesState(globalDownloadedMapFiles);
    };

    listeners.add(handleStoreChange);
    handleStoreChange(); // Initial sync

    return () => {
      listeners.delete(handleStoreChange);
    };
  }, []);

  const checkPauseStatus = useCallback(async () => {
    try {
      let expectedFiles: Array<{ name?: string; path?: string; uri: string }> = MBTILES_PATHS;
      const storedList = await AsyncStorage.getItem('@elk_downloaded_maps');
      if (storedList) {
        const filenames = JSON.parse(storedList);
        if (Array.isArray(filenames)) {
          expectedFiles = filenames.map(name => ({ name, uri: docDir + name }));
        }
      }

      let hasResumeData = false;
      for (const file of expectedFiles) {
        const resumeKey = `@elk_map_resume_${file.name || file.uri.split('/').pop()}`;
        const savedResume = await AsyncStorage.getItem(resumeKey);
        if (savedResume) {
          hasResumeData = true;
          break;
        }
      }
      setIsPaused(hasResumeData);
      return hasResumeData;
    } catch {
      return false;
    }
  }, []);

  const checkMapStatus = useCallback(async () => {
    try {
      // Use dynamically saved list if available, else fall back to static list
      let expectedFiles: Array<{ name?: string; path?: string; uri: string }> = MBTILES_PATHS;
      try {
        const storedList = await AsyncStorage.getItem('@elk_downloaded_maps');
        if (storedList) {
          const filenames = JSON.parse(storedList);
          if (Array.isArray(filenames)) {
            expectedFiles = filenames.map((name: string) => ({ uri: docDir + name }));
          }
        }
      } catch (e) { }

      if (expectedFiles.length === 0) {
        setDownloadedMapFiles([]);
        setHasMap(false);
        return false;
      }

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
      if (dismissedSession) {
        setConsentStatus('dismissed');
        return;
      }
      const stored = await AsyncStorage.getItem(CONSENT_KEY);
      if (stored === 'dismissed') {
        // Clear legacy persistent 'dismissed' status so it transitions to session-only
        await AsyncStorage.removeItem(CONSENT_KEY);
        setConsentStatus(null);
      } else {
        setConsentStatus(stored);
      }
    } catch (e) {
      console.log('Error loading consent', e);
    }
  }, []);

  const saveConsent = async (status: 'yes' | 'no' | 'dismissed', persist: boolean = true) => {
    try {
      if (status === 'dismissed') {
        dismissedSession = true;
        setConsentStatus('dismissed');
      } else {
        if (persist) {
          await AsyncStorage.setItem(CONSENT_KEY, status);
        }
        setConsentStatus(status);
      }
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

    if (isAnyDownloadActive) {
      console.log('Download aborted: Another download is already active');
      return;
    }

    try {
      isAnyDownloadActive = true;
      setIsDownloading(true);
      setIsPaused(false);
      isPausedRef.current = false;
      isCancelledRef.current = false;
      setMbtilesError(false);

      // Try to fetch dynamic list from WP API
      let filesToDownload: Array<{ name: string; path: string; uri: string; downloadUrl: string; modified_at?: string }> =
        MBTILES_PATHS.map(f => ({ ...f, downloadUrl: `${BASE_URL}/${f.name}` }));
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
              modified_at: rf.modified_at,
            }));
            await AsyncStorage.setItem(
              '@elk_downloaded_maps',
              JSON.stringify(remoteFiles.map((rf: { filename: string, url: string }) => rf.filename))
            );
            const initialMeta: Record<string, any> = {};
            remoteFiles.forEach(rf => {
              initialMeta[rf.filename] = { url: rf.url, modified_at: rf.modified_at };
            });
            await AsyncStorage.setItem('@elk_downloaded_maps_meta', JSON.stringify(initialMeta));
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
        const resumeKey = `@elk_map_resume_${file.name}`;
        let savedResume = await AsyncStorage.getItem(resumeKey);

        if (savedResume) {
          const metaStr = await AsyncStorage.getItem('@elk_downloaded_maps_meta');
          let metaMatches = true;
          if (metaStr) {
            try {
              const meta = JSON.parse(metaStr);
              const localMeta = meta[file.name];
              if (isMapFileOutdated(localMeta, { url: file.downloadUrl, modified_at: file.modified_at })) {
                metaMatches = false;
              }
            } catch (e) {
              metaMatches = false;
            }
          } else {
            metaMatches = false;
          }

          if (!metaMatches) {
            console.log(`[useOfflineMap] Remote map file has been updated on the server. Discarding resume state and starting fresh.`);
            await AsyncStorage.removeItem(resumeKey);
            savedResume = null;
          } else {
            const rangeSupported = await checkRangeSupport(file.downloadUrl);
            if (!rangeSupported) {
              console.log(`[useOfflineMap] Server does not support HTTP Range requests. Discarding resume state and starting fresh.`);
              await AsyncStorage.removeItem(resumeKey);
              savedResume = null;
            }
          }
        }

        let downloadResumable;
        if (savedResume) {
          console.log(`Resuming download for ${file.name} from saved state...`);
          try {
            downloadResumable = FileSystem.createDownloadResumable(
              file.downloadUrl,
              tmpUri,
              {},
              (progress) => {
                if (progress.totalBytesExpectedToWrite > 0) {
                  const filePercent = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
                  const overallPercent = (completedDownloads + filePercent) / filesToDownload.length;
                  setDownloadProgress(overallPercent);
                }
              },
              savedResume
            );
          } catch (resErr) {
            console.warn('Failed to parse or initialize resume state, starting fresh:', resErr);
            await AsyncStorage.removeItem(resumeKey);
          }
        }

        if (!downloadResumable) {
          // Delete any leftover temporary file ONLY if we are starting a fresh download (no resume data)
          const tmpInfo = await FileSystem.getInfoAsync(tmpUri);
          if (tmpInfo.exists) {
            await FileSystem.deleteAsync(tmpUri, { idempotent: true });
          }

          downloadResumable = FileSystem.createDownloadResumable(
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
        }

        globalDownloadResumable = downloadResumable;
        globalActiveDownloadingFile = file.name;

        const result = await downloadResumable.downloadAsync();

        if (isPausedRef.current) {
          console.log(`[useOfflineMap] downloadAsync stopped because it was paused.`);
          return;
        }

        // Clean up resume data on successful completion
        await AsyncStorage.removeItem(resumeKey);

        if (result && (result.status === 200 || result.status === 206)) {
          // Validate downloaded file is a real SQLite/MBTiles database and not empty
          const valid = await isValidMbtiles(tmpUri);
          const finalInfo = await FileSystem.getInfoAsync(tmpUri);

          // An MBTiles file should be at least a few MBs. If it's less than 1MB, it's likely an error page or corrupt.
          const isLargeEnough = finalInfo.exists && finalInfo.size > 1024 * 1024;

          if (!valid || !isLargeEnough) {
            const actualSize = finalInfo.exists ? finalInfo.size : 0;
            await FileSystem.deleteAsync(tmpUri, { idempotent: true });
            throw new Error(
              `Downloaded file "${file.name}" is not a valid MBTiles database (valid: ${valid}, size: ${actualSize} bytes).\n` +
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
        setIsPaused(false);
      } else {
        throw new Error('Downloads finished but some files are still missing');
      }
    } catch (error) {
      if (isPausedRef.current) {
        console.log('Download catch block: download was paused.');
        setIsPaused(true);
        return;
      }
      const err = error as Error;
      if (isCancelledRef.current || (err?.message && err.message.toLowerCase().includes('cancel'))) {
        console.log('Download was cancelled.');
        setIsPaused(false);
        setMbtilesError(false);
      } else if (err?.message && err.message.toLowerCase().includes('pause')) {
        console.log('Download was paused.');
        setIsPaused(true);
      } else {
        console.warn('Error downloading maps:', error);
        setMbtilesError(true);
        setIsPaused(false);
      }
    } finally {
      globalDownloadResumable = null;
      globalActiveDownloadingFile = null;
      setIsDownloading(false);
      isAnyDownloadActive = false;
    }
  };

  const cancelDownload = async () => {
    isCancelledRef.current = true;
    try {
      if (globalDownloadResumable) {
        await globalDownloadResumable.cancelAsync();
      }
    } catch (e) {
      console.log('Error cancelling download', e);
    }
    // Delete any partially downloaded map tiles to prevent corruption
    await deleteMap();
  };

  const pauseDownload = async () => {
    try {
      isPausedRef.current = true;
      if (globalDownloadResumable) {
        const resumable = globalDownloadResumable;
        const currentFile = globalActiveDownloadingFile;
        const pauseState = await resumable.pauseAsync();

        if (pauseState && pauseState.resumeData && currentFile) {
          await AsyncStorage.setItem(`@elk_map_resume_${currentFile}`, pauseState.resumeData);
          console.log(`[useOfflineMap] Manually paused download for ${currentFile}`);
        }
        setIsPaused(true);
        setIsDownloading(false);
      }
    } catch (e) {
      console.log('Error pausing download', e);
    }
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
      } catch (e) { }

      for (const uri of filesToDelete) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(uri);
        }
        const tmpUri = uri + '.tmp';
        const tmpInfo = await FileSystem.getInfoAsync(tmpUri);
        if (tmpInfo.exists) {
          await FileSystem.deleteAsync(tmpUri);
        }
      }

      // Clear all resume data keys
      try {
        let expectedFiles: Array<{ name?: string; path?: string; uri: string }> = MBTILES_PATHS;
        const storedList = await AsyncStorage.getItem('@elk_downloaded_maps');
        if (storedList) {
          const filenames = JSON.parse(storedList);
          if (Array.isArray(filenames)) {
            expectedFiles = filenames.map(name => ({ name, uri: docDir + name }));
          }
        }
        for (const file of expectedFiles) {
          await AsyncStorage.removeItem(`@elk_map_resume_${file.name || file.uri.split('/').pop()}`);
        }
      } catch (e) { }

      await AsyncStorage.removeItem('@elk_downloaded_maps');
      await AsyncStorage.removeItem('@elk_downloaded_maps_meta');
      setHasMap(false);
      setDownloadedMapFiles([]);
      setDownloadProgress(0);
      setIsPaused(false);
      dismissedSession = false;
      setConsentStatus(null);
      await AsyncStorage.removeItem(CONSENT_KEY);
      console.log('Maps and consent deleted successfully');
    } catch (error) {
      console.log('Error deleting maps', error);
    }
  };

  const silentUpdateMap = async () => {
    if (isExpoGo || !BASE_URL || isAnyDownloadActive) return;

    const isDownloaded = await checkMapStatus();

    if (!isDownloaded) {
      const consent = await AsyncStorage.getItem(CONSENT_KEY);
      if (consent === 'yes') {
        downloadMap().catch(e => console.warn('[SilentSync] Auto-download failed:', e));
      }
      return;
    }

    try {
      isAnyDownloadActive = true;
      const wpBase = BASE_URL.replace(/\/map-download\/?$/, '');
      const listRes = await fetch(`${wpBase}/map-files?t=${Date.now()}`);
      if (!listRes.ok) {
        isAnyDownloadActive = false;
        return;
      }
      const remoteFiles = await listRes.json();
      if (!Array.isArray(remoteFiles) || remoteFiles.length === 0) {
        isAnyDownloadActive = false;
        return;
      }

      const storedMetaStr = await AsyncStorage.getItem('@elk_downloaded_maps_meta');
      let storedMeta: Record<string, { url: string; modified_at?: string }> = {};
      if (storedMetaStr) {
        try {
          storedMeta = JSON.parse(storedMetaStr);
        } catch (e) { }
      }

      let updatesMade = false;

      for (const rf of remoteFiles) {
        const local = storedMeta[rf.filename];
        const needsUpdate = isMapFileOutdated(local, { url: rf.url, modified_at: rf.modified_at });

        if (needsUpdate) {
          const uri = docDir + rf.filename;
          const tmpUri = uri + '.tmp';

          const tmpInfo = await FileSystem.getInfoAsync(tmpUri);
          if (tmpInfo.exists) {
            await FileSystem.deleteAsync(tmpUri, { idempotent: true });
          }

          const downloadResumable = FileSystem.createDownloadResumable(rf.url, tmpUri);
          console.log('Map downloading in sync');
          const result = await downloadResumable.downloadAsync();

          if (result && result.status === 200) {
            const valid = await isValidMbtiles(tmpUri);
            const finalInfo = await FileSystem.getInfoAsync(tmpUri);
            const isLargeEnough = finalInfo.exists && finalInfo.size > 1024 * 1024;

            if (valid && isLargeEnough) {
              await FileSystem.moveAsync({ from: tmpUri, to: uri });
              storedMeta[rf.filename] = {
                url: rf.url,
                modified_at: rf.modified_at,
              };
              updatesMade = true;
            } else {
              await FileSystem.deleteAsync(tmpUri, { idempotent: true });
            }
          } else {
            await FileSystem.deleteAsync(tmpUri, { idempotent: true });
          }
        }
      }

      if (updatesMade) {
        await AsyncStorage.setItem('@elk_downloaded_maps_meta', JSON.stringify(storedMeta));
        await checkMapStatus();
      }
    } catch (e) {
      console.log('[SilentSync] Error silently updating map files:', e);
    } finally {
      isAnyDownloadActive = false;
    }
  };

  useEffect(() => {
    (async () => {
      setIsInitializing(true);
      await loadConsent();
      await checkMapStatus();
      await checkPauseStatus();
      // Do NOT auto-download here — the consent modal in the UI must be shown
      // and the user must explicitly agree before downloading starts.
      setIsInitializing(false);
    })();
  }, [checkMapStatus, checkPauseStatus, loadConsent]);

  return {
    hasMap,
    mbtilesError,
    isExpoGo,
    downloadProgress,
    isDownloading,
    isPaused,
    consentStatus,
    saveConsent,
    downloadMap,
    silentUpdateMap,
    pauseDownload,
    cancelDownload,
    deleteMap,
    setMbtilesError,
    checkMapStatus,
    isInitializing,
    downloadedMapFiles,
  };
};
