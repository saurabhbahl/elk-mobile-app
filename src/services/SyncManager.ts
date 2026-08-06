import NetInfo from '@react-native-community/netinfo';
import { ApiService } from '../api/ApiService';
import { db } from '../database/index';
import { appRepository } from '../repositories/AppRepository';
import { cacheImageIfNeeded, clearImageCache } from '../utils/imageCache';

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
  // 2b. Plan Your Trip Hero
  if (d.plan_your_trip) {
    const trip = d.plan_your_trip as Record<string, unknown>;
    if (trip.hero_image) addImage(trip.hero_image, ['plan_your_trip', 'hero_image']);
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

  // General Arrays
  const checkArray = (key: string) => {
    if (d[key] && Array.isArray(d[key])) {
      (d[key] as Record<string, unknown>[]).forEach((item: Record<string, unknown>, idx: number) => {
        addImage(item.thumbnail_image || item.featured_image || item.nav_image, [key, String(idx), item.thumbnail_image ? 'thumbnail_image' : item.featured_image ? 'featured_image' : 'nav_image']);

        // Rentals use the first image in 'additional_images' as their listing featured image
        if (key === 'rentals' && item.additional_images && Array.isArray(item.additional_images) && item.additional_images.length > 0) {
          addImage(item.additional_images[0], [key, String(idx), 'additional_images', '0']);
        }

        // Tips use 'tip_icon__image' for their listing screen icon
        if (key === 'tips' && item.tip_icon__image) {
          addImage(item.tip_icon__image, [key, String(idx), 'tip_icon__image']);
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
  static async triggerDeltaSync(): Promise<boolean> {
    console.log("[SyncManager] Triggering background delta sync");
    try {
      const lastSyncTime = appRepository.getMetadata('last_full_sync');
      const settingsMap = appRepository.getAllSettings();

      // If lastSyncTime is missing, or critical settings like app_branding are corrupted (empty array from previous bug), force full sync
      if (!lastSyncTime || !settingsMap.app_branding || (Array.isArray(settingsMap.app_branding) && settingsMap.app_branding.length === 0)) {
        console.log("[SyncManager] Missing or corrupt local data (empty arrays). Forcing FULL sync.");
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
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No network connection available for initial sync');
    }

    try {
      if (onProgress) onProgress(0.05, 'Downloading app content...');

      console.log("[SyncManager] Fetching sync data from API...");
      console.log("[SyncManager] Fetching sync data from API...");
      let rootJson = await ApiService.fetchSyncData(isDelta, lastSyncTime);
      let syncTime = typeof rootJson.sync_time === 'string' ? rootJson.sync_time : new Date().toISOString();
      let json = rootJson;
      if (json && json.data && typeof json.data === 'object' && !json.app_branding) {
        json = json.data as Record<string, unknown>;
        console.log("[SyncManager] Unwrapped data payload keys:", Object.keys(json || {}));
      }

      // Early save branding to SQLite so it can be loaded on the splash screen immediately
      try {
        if (json.app_branding && (!Array.isArray(json.app_branding) || json.app_branding.length > 0)) {
          console.log("[SyncManager] Saving app branding settings early...");
          appRepository.upsertSetting('app_branding', JSON.stringify(json.app_branding));
        }
      } catch (err) {
        console.warn('Failed to save branding early:', err);
      }

      if (onProgress) onProgress(0.2, 'Preparing app photos...');
      const imagesToDownload = extractPreCacheUrls(json);
      const totalImages = imagesToDownload.length;
      let downloadedCount = 0;

      if (totalImages > 0) {
        const CONCURRENCY = 4;
        let index = 0;

        const downloadWorker = async () => {
          while (true) {
            const currentIndex = index++;
            if (currentIndex >= totalImages) break;
            const item = imagesToDownload[currentIndex];
            try {
              // Call cacheImageIfNeeded with a 15-second timeout
              await Promise.race([
                cacheImageIfNeeded(item.url),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
              ]);
            } catch (err) {
              console.warn(`Failed to pre-cache image (or timed out): ${item.url}`);
            }

            downloadedCount++;
            if (onProgress) {
              const pct = 0.2 + (downloadedCount / totalImages) * 0.7;
              onProgress(pct, `Downloading app photos`);
            }
          }
        };

        const workers = Array(Math.min(CONCURRENCY, totalImages))
          .fill(null)
          .map(() => downloadWorker());
        await Promise.all(workers);
      }

      if (onProgress) onProgress(0.95, 'Finalizing offline setup...');

      db.withTransactionSync(() => {
        if (!isDelta) {
          appRepository.clearAll();
        }

        const settingsKeys = [
          'app_branding', 'popup_content', 'home_screen', 'plan_your_trip',
          'visitors', 'programs_setting', 'event_settings', 'live_cam_settings',
          'trail_settings', 'rental_settings', 'tips_screen_settings',
          'map_settings', 'navigation'
        ];

        for (const key of settingsKeys) {
          const val = json[key];
          // For settings, only upsert if present and not an empty array
          if (val && (!Array.isArray(val) || val.length > 0)) {
            appRepository.upsertSetting(key, JSON.stringify(val));
          }
        }

        const recordTypes = [
          { type: 'programs', array: json.programs },
          { type: 'events', array: json.events },
          { type: 'trails', array: json.trails },
          { type: 'rentals', array: json.rentals },
          { type: 'tips', array: json.tips },
          { type: 'pois', array: json.pois },
          { type: 'cameras', array: json.cameras }
        ];

        for (const item of recordTypes) {
          if (item.array && Array.isArray(item.array)) {
            (item.array as Record<string, unknown>[]).forEach((rec: Record<string, unknown>) => {
              const id = rec.id ? String(rec.id) : String(Math.random());
              const lastModified = rec.updated_at ? String(rec.updated_at) : hashString(JSON.stringify(rec));
              appRepository.upsertRecord(id, item.type, JSON.stringify(rec), lastModified);
            });
          }
        }

        // Process deletions if any
        if (isDelta && json.deleted && typeof json.deleted === 'object') {
          const deleted = json.deleted as Record<string, unknown[]>;
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

      if (onProgress) onProgress(1.0, 'Sync complete!');
      return true;
    } catch (e) {
      console.error('Fetch and store error:', e);
      throw e;
    }
  }

  static cleanupExpiredEvents() {
    try {
      const settings = appRepository.getAllSettings();
      const eventSettings = settings.event_settings as any;
      if (!eventSettings) return;

      const visibility = eventSettings.past_events_visibility;
      if (visibility?.toLowerCase() !== 'hide') return;

      // 1. Purge from events table
      const records = appRepository.getAllRecords();
      if (records.events) {
        records.events.forEach((ev: any) => {
          if (SyncManager.isEventExpired(ev, visibility)) {
            appRepository.deleteRecord(String(ev.id), 'events');
          }
        });
      }

      // 2. We do NOT purge from home_screen setting permanently in SQLite, 
      // because we would lose the featured_event ID. Instead, we dynamically 
      // cross-reference it in AppContentContext.tsx on load!
    } catch (e) {
      console.warn("Error cleaning up expired events from DB:", e);
    }
  }

  static isEventExpired(event: any, pastEventsVisibility: string | undefined | null): boolean {
    if (!event) return true;
    if (pastEventsVisibility?.toLowerCase() !== 'hide') return false;

    const dateStr = event['end_date_&_time'] || event['start_date_&_time'];
    if (!dateStr || typeof dateStr !== 'string') return false;

    try {
      let cleanStr = dateStr.replace(' at ', ' ').trim();
      const match = cleanStr.match(/(\d{2})\/(\d{2})\/(\d{4})(.*)/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed month
        const year = parseInt(match[3], 10);
        const timePart = match[4].trim();

        let hours = 0;
        let mins = 0;
        const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          mins = parseInt(timeMatch[2], 10);
          const isPM = timeMatch[3].toLowerCase() === 'pm';

          if (isPM && h < 12) h += 12;
          if (!isPM && h === 12) h = 0;
          hours = h;
        }

        const eventTime = new Date(year, month, day, hours, mins, 0).getTime();

        if (!isNaN(eventTime)) {
          return eventTime < Date.now();
        }
      }
    } catch (e) {
      console.warn("Failed to parse event date for expiration check", e);
    }

    return false;
  }
}
