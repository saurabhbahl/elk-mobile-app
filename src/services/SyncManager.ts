import NetInfo from '@react-native-community/netinfo';
import { ApiService } from '../api/ApiService';
import { db } from '../database/index';
import { appRepository } from '../repositories/AppRepository';
import { cacheImageIfNeeded, clearImageCache } from '../utils/imageCache';
import { isDateExpired } from '../utils/dateUtils';

// Helper to set nested object properties in-place
function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) return;
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

// Generate simple hash of a string
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

// Extract featured images to pre-cache
function extractPreCacheUrls(data: Record<string, unknown> | unknown): { path: string[]; url: string }[] {
  const list: { path: string[]; url: string }[] = [];

  const addImage = (obj: Record<string, unknown> | unknown, path: string[]) => {
    if (!obj) return;
    if (typeof obj === 'string' && obj.startsWith('http')) {
      list.push({ path, url: obj });
    } else if (typeof obj === 'object' && (obj as Record<string, string>).url && typeof (obj as Record<string, string>).url === 'string' && (obj as Record<string, string>).url.startsWith('http')) {
      list.push({ path: [...path, 'url'], url: (obj as Record<string, string>).url });
    }
  };

  const d = data as Record<string, unknown>;

  // 1. App Branding
  if (d.app_branding) {
    const branding = d.app_branding as Record<string, unknown>;
    addImage(branding.logo_primary, ['app_branding', 'logo_primary']);
    addImage(branding.logo_secondary, ['app_branding', 'logo_secondary']);
    addImage(branding.splash_loading_screen_background, ['app_branding', 'splash_loading_screen_background']);
  }
  // 2. Popup Content
  if (d.popup_content) {
    const popup = d.popup_content as Record<string, unknown>;
    addImage(popup.popup_image, ['popup_content', 'popup_image']);
  }
  // 2b. Plan Your Trip Hero & Gallery
  if (d.plan_your_trip) {
    const trip = d.plan_your_trip as Record<string, unknown>;
    if (trip.hero_image) addImage(trip.hero_image, ['plan_your_trip', 'hero_image']);
    if (Array.isArray(trip.image_gallery)) {
      trip.image_gallery.forEach((img, idx) => {
        addImage(img, ['plan_your_trip', 'image_gallery', String(idx)]);
      });
    }
  }
  // 2c. Tips Settings Icon
  if (d.tips_screen_settings) {
    const tipsS = d.tips_screen_settings as Record<string, unknown>;
    if (tipsS.header_icon) addImage(tipsS.header_icon, ['tips_screen_settings', 'header_icon']);
  }
  // 3. Home Screen
  const hs = d.home_screen as Record<string, unknown>;
  if (hs?.featured_event && Array.isArray(hs.featured_event)) {
    hs.featured_event.forEach((ev: Record<string, unknown>, idx: number) => {
      addImage(ev.thumbnail_image, ['home_screen', 'featured_event', String(idx), 'thumbnail_image']);
    });
  }
  if (hs?.programs && Array.isArray(hs.programs)) {
    hs.programs.forEach((prog: Record<string, unknown>, idx: number) => {
      addImage(prog.thumbnail_image, ['home_screen', 'programs', String(idx), 'thumbnail_image']);
    });
  }
  if (hs?.sponsorship_information) {
    const sp = hs.sponsorship_information as Record<string, unknown>;
    if (sp.grant_logo) {
      addImage(sp.grant_logo, ['home_screen', 'sponsorship_information', 'grant_logo']);
    }
  }

  // General Arrays
  const checkArray = (key: string) => {
    if (d[key] && Array.isArray(d[key])) {
      (d[key] as Record<string, unknown>[]).forEach((item: Record<string, unknown>, idx: number) => {
        addImage(item.thumbnail_image || item.featured_image || item.nav_image, [key, String(idx), item.thumbnail_image ? 'thumbnail_image' : item.featured_image ? 'featured_image' : 'nav_image']);

        // Rentals use the first image in 'additional_images' as their listing featured image
        if (key === 'rentals' && item.additional_images && Array.isArray(item.additional_images) && item.additional_images.length > 0) {
          addImage(item.additional_images[0], [key, String(idx), 'additional_images', '0']);
        }

        // Tips use 'tip_icon_image' for their listing screen icon
        if (key === 'tips' && item.tip_icon_image) {
          addImage(item.tip_icon_image, [key, String(idx), 'tip_icon_image']);
        }

        // POIs custom map pin icons
        if (key === 'pois' && item.pin_icon_override) {
          addImage(item.pin_icon_override, [key, String(idx), 'pin_icon_override']);
        }
      });
    }
  };
  ['programs', 'events', 'trails', 'rentals', 'tips', 'pois', 'navigation'].forEach(checkArray);

  return list;
}

export class SyncManager {
  private static activeSyncPromise: Promise<boolean> | null = null;
  private static progressListeners = new Set<(progress: number, status: string) => void>();

  private static notifyProgress(progress: number, status: string) {
    SyncManager.progressListeners.forEach(listener => {
      try {
        listener(progress, status);
      } catch (err) {
        console.warn("[SyncManager] Error in progress listener:", err);
      }
    });
  }

  static async triggerDeltaSync(): Promise<boolean> {
    console.log("[SyncManager] Triggering background delta sync");
    try {
      const lastSyncTime = appRepository.getMetadata('last_full_sync');
      const settingsMap = appRepository.getAllSettings();

      // If lastSyncTime is missing, or critical settings like app_branding are corrupted, force full sync
      if (!lastSyncTime || !settingsMap.app_branding || (Array.isArray(settingsMap.app_branding) && settingsMap.app_branding.length === 0)) {
        console.log("[SyncManager] Missing or corrupt local data. Forcing FULL sync.");
        const res = await this.fetchAndStoreAll();
        console.log("[SyncManager] Background full sync completed. Result:", res);
        return res;
      }

      const res = await this.fetchAndStoreAll(undefined, true, lastSyncTime);
      console.log("[SyncManager] Background delta sync completed. Result:", res);
      return res;
    } catch (e) {
      console.error("[SyncManager] Background delta sync error:", e);
      return false;
    }
  }

  static isSyncComplete(): boolean {
    return appRepository.getMetadata('is_sync_complete') === 'true';
  }

  static async clearLocalCache() {
    try {
      await clearImageCache();
      appRepository.clearAll();
      console.log("Local database and image cache cleared successfully");
    } catch (e) {
      console.error("Failed to clear local cache:", e);
    }
  }

  static async fetchAndStoreAll(
    onProgress?: (progress: number, status: string) => void,
    isDelta = false,
    lastSyncTime?: string
  ): Promise<boolean> {
    if (onProgress) {
      SyncManager.progressListeners.add(onProgress);
    }

    if (SyncManager.activeSyncPromise) {
      console.log("[SyncManager] Sync already in progress, awaiting active sync...");
      return SyncManager.activeSyncPromise;
    }

    const task = (async () => {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No network connection available for initial sync');
      }

    try {
      SyncManager.notifyProgress(0.05, 'Downloading app content...');

      console.log("[SyncManager] Fetching split sync data from endpoints parallelly...");
      const endpoints = ['pois', 'programs', 'events', 'trails', 'rentals', 'tips', 'cameras', 'settings'];
      const totalEndpoints = endpoints.length;
      let completedEndpoints = 0;

      const fetchPromises = endpoints.map(async (endpoint) => {
        try {
          const res = await ApiService.fetchEndpointData<any>(endpoint, isDelta, lastSyncTime);
          completedEndpoints++;
          const pct = 0.05 + (completedEndpoints / totalEndpoints) * 0.45;
          SyncManager.notifyProgress(pct, 'Downloading app content...');
          return { endpoint, data: res };
        } catch (err) {
          console.error(`[SyncManager] Error fetching split endpoint ${endpoint}:`, err);
          throw err;
        }
      });

      const results = await Promise.all(fetchPromises);

      // Merge results into a unified structure for transaction parsing
      const mergedJson: Record<string, any> = { deleted: {} };
      let syncTime = new Date().toISOString();

      results.forEach(({ endpoint, data }) => {
        if (!data) return;

        if (data.sync_time) {
          syncTime = data.sync_time;
        }

        // Unwrap data property if wrapped by WP API
        const payload = (data && data.data && typeof data.data === 'object') ? data.data : data;

        if (endpoint === 'settings') {
          Object.keys(payload).forEach(key => {
            mergedJson[key] = payload[key];
          });
        } else {
          if (Array.isArray(payload)) {
            mergedJson[endpoint] = payload;
          } else if (payload && Array.isArray(payload[endpoint])) {
            mergedJson[endpoint] = payload[endpoint];
          } else if (payload && Array.isArray(payload.data)) {
            mergedJson[endpoint] = payload.data;
          }

          const deletedIds = data.deleted || (payload && payload.deleted);
          if (Array.isArray(deletedIds)) {
            mergedJson.deleted[endpoint] = deletedIds;
          }
        }
      });

      // Early save branding to SQLite so it can be loaded on the splash screen immediately
      try {
        if (mergedJson.app_branding && (!Array.isArray(mergedJson.app_branding) || mergedJson.app_branding.length > 0)) {
          console.log("[SyncManager] Saving app branding settings early...");
          appRepository.upsertSetting('app_branding', JSON.stringify(mergedJson.app_branding));
        }
      } catch (err) {
        console.warn('Failed to save branding early:', err);
      }

      SyncManager.notifyProgress(0.50, 'Preparing app photos...');
      const imagesToDownload = extractPreCacheUrls(mergedJson);
      const totalImages = imagesToDownload.length;
      let downloadedCount = 0;

      if (totalImages > 0) {
        const CONCURRENCY = 2;
        let index = 0;

        const downloadWorker = async () => {
          while (true) {
            const currentIndex = index++;
            if (currentIndex >= totalImages) break;
            const item = imagesToDownload[currentIndex];
            try {
              await cacheImageIfNeeded(item.url);
            } catch (err) {
              console.warn(`Failed to pre-cache image: `, err);
            }

            downloadedCount++;
            const pct = 0.50 + (downloadedCount / totalImages) * 0.45;
            SyncManager.notifyProgress(pct, 'Downloading app photos');
          }
        };

        const workers = Array(Math.min(CONCURRENCY, totalImages))
          .fill(null)
          .map(() => downloadWorker());
        await Promise.all(workers);
      } else {
        SyncManager.notifyProgress(0.95, 'Finalizing offline setup...');
      }

      if (!isDelta) {
        db.withTransactionSync(() => {
          appRepository.clearAll();
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // 1. Write settings in a dedicated transaction block
      const settingsKeys = [
        'app_branding', 'popup_content', 'home_screen', 'plan_your_trip',
        'visitors', 'programs_setting', 'event_settings', 'live_cam_settings',
        'trail_settings', 'rental_settings', 'tips_screen_settings',
        'map_settings', 'navigation'
      ];

      db.withTransactionSync(() => {
        for (const key of settingsKeys) {
          const val = mergedJson[key];
          if (val && (!Array.isArray(val) || val.length > 0)) {
            appRepository.upsertSetting(key, JSON.stringify(val));
          }
        }
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      // 2. Write record types in chunked transaction blocks yielding to UI thread
      const recordTypes = [
        { type: 'pois', array: mergedJson.pois },
        { type: 'programs', array: mergedJson.programs },
        { type: 'events', array: mergedJson.events },
        { type: 'trails', array: mergedJson.trails },
        { type: 'rentals', array: mergedJson.rentals },
        { type: 'tips', array: mergedJson.tips },
        { type: 'cameras', array: mergedJson.cameras }
      ];

      for (const item of recordTypes) {
        if (item.array && Array.isArray(item.array) && item.array.length > 0) {
          db.withTransactionSync(() => {
            (item.array as Record<string, unknown>[]).forEach((rec: Record<string, unknown>) => {
              const id = rec.id ? String(rec.id) : String(Math.random());
              const lastModified = rec.updated_at ? String(rec.updated_at) : hashString(JSON.stringify(rec));
              appRepository.upsertRecord(id, item.type, JSON.stringify(rec), lastModified);
            });
          });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // 3. Deletions, cleanup, and metadata finalization block
      db.withTransactionSync(() => {
        if (isDelta && mergedJson.deleted && typeof mergedJson.deleted === 'object') {
          const deleted = mergedJson.deleted as Record<string, unknown[]>;
          for (const item of recordTypes) {
            if (deleted[item.type] && Array.isArray(deleted[item.type])) {
              deleted[item.type].forEach((idToDel: unknown) => {
                appRepository.deleteRecord(String(idToDel), item.type);
              });
            }
          }
        }

        // Cleanup expired events dynamically from database to keep SQLite clean
        SyncManager.cleanupExpiredEvents();

        appRepository.upsertMetadata('is_sync_complete', 'true');
        appRepository.upsertMetadata('last_full_sync', syncTime);
      });

      SyncManager.notifyProgress(1.0, 'Sync complete!');
      return true;
    } catch (e) {
      console.error('Fetch and store error:', e);
      throw e;
    }
    })();

    SyncManager.activeSyncPromise = task;
    try {
      return await task;
    } finally {
      SyncManager.activeSyncPromise = null;
      SyncManager.progressListeners.clear();
    }
  }

  static cleanupExpiredEvents() {
    try {
      const settings = appRepository.getAllSettings();
      const eventSettings = settings.event_settings as any;
      if (!eventSettings) return;

      const visibility = eventSettings.past_events_visibility;
      if (visibility?.toLowerCase() !== 'hide') return;

      // Purge from events table
      const records = appRepository.getAllRecords();
      if (records.events) {
        records.events.forEach((ev: any) => {
          if (SyncManager.isEventExpired(ev, visibility)) {
            appRepository.deleteRecord(String(ev.id), 'events');
          }
        });
      }
    } catch (e) {
      console.warn("Error cleaning up expired events from DB:", e);
    }
  }

  static isEventExpired(event: any, pastEventsVisibility: string | undefined | null): boolean {
    if (!event) return true;
    if (pastEventsVisibility?.toLowerCase() !== 'hide') return false;

    const dateStr = event['end_date_&_time'] || event['start_date_&_time'];
    if (!dateStr || typeof dateStr !== 'string') return false;

    return isDateExpired(dateStr);
  }
}
