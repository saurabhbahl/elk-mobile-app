import { cacheImageIfNeeded, clearImageCache } from '../utils/imageCache';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../database/index';
import { ApiService } from '../api/ApiService';
import { appRepository } from '../repositories/AppRepository';

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
  }
  // 2. Popup Content
  if (d.popup_content) {
    const popup = d.popup_content as Record<string, unknown>;
    addImage(popup.popup_image, ['popup_content', 'popup_image']);
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
      return await this.fetchAndStoreAll();
    } catch (e) {
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
    onProgress?: (progress: number, status: string) => void
  ): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No network connection available for initial sync');
    }

    try {
      if (onProgress) onProgress(0.05, 'Fetching content data...');
      
      let json = await ApiService.fetchSyncData();
      if (json && json.data && typeof json.data === 'object' && !json.app_branding) {
        json = json.data as Record<string, unknown>;
      }

      if (onProgress) onProgress(0.2, 'Preparing image downloads...');
      const imagesToDownload = extractPreCacheUrls(json);
      const totalImages = imagesToDownload.length;
      let downloadedCount = 0;

      for (let i = 0; i < totalImages; i++) {
        const item = imagesToDownload[i];
        try {
          const localUri = await cacheImageIfNeeded(item.url);
          setNestedValue(json, item.path, localUri);
        } catch (err) {
          console.warn(`Failed to pre-cache image: ${item.url}`, err);
        }

        downloadedCount++;
        if (onProgress) {
          const pct = 0.2 + (downloadedCount / totalImages) * 0.7;
          onProgress(pct, `Caching images (${downloadedCount}/${totalImages})...`);
        }
      }

      if (onProgress) onProgress(0.95, 'Saving database tables...');

      db.withTransactionSync(() => {
        appRepository.clearAll();

        const settingsKeys = [
          'app_branding', 'popup_content', 'home_screen', 'plan_your_trip',
          'visitors', 'programs_setting', 'event_settings', 'live_cam_settings',
          'trail_settings', 'rental_settings', 'tips_screen_settings',
          'map_settings', 'navigation'
        ];
        
        for (const key of settingsKeys) {
          if (json[key]) {
            appRepository.upsertSetting(key, JSON.stringify(json[key]));
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

        appRepository.upsertMetadata('is_sync_complete', 'true');
        appRepository.upsertMetadata('last_full_sync', new Date().toISOString());
      });

      if (onProgress) onProgress(1.0, 'Sync complete!');
      return true;
    } catch (e) {
      console.error('Fetch and store error:', e);
      throw e;
    }
  }
}
