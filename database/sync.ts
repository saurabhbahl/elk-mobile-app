import { cacheImageIfNeeded, clearImageCache } from '@/utils/imageCache';
import NetInfo from '@react-native-community/netinfo';
import { db } from './index';

// Fetch with a timeout to prevent hanging on slow/dead API
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// Helper to set nested object properties in-place
function setNestedValue(obj: any, path: string[], value: any) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) return;
    current = current[path[i]];
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

export function getLastSyncMetadata(key: string): string | null {
  try {
    const row = db.getFirstSync("SELECT value FROM sync_metadata WHERE key = ?;", [key]) as { value: string } | null;
    return row ? row.value : null;
  } catch (e) {
    console.error("Failed to query sync metadata:", e);
    return null;
  }
}

export function isSyncComplete(): boolean {
  return getLastSyncMetadata('is_sync_complete') === 'true';
}

export async function clearLocalCache() {
  try {
    // Clear all locally cached images via unified imageCache utility
    await clearImageCache();
    db.withTransactionSync(() => {
      db.runSync("DELETE FROM app_records;");
      db.runSync("DELETE FROM app_settings;");
      db.runSync("DELETE FROM sync_metadata;");
    });
    console.log("Local database and image cache cleared successfully");
  } catch (e) {
    console.error("Failed to clear local cache:", e);
  }
}

// Extract featured images to pre-cache
function extractPreCacheUrls(data: any): { path: string[]; url: string }[] {
  const list: { path: string[]; url: string }[] = [];

  const addImage = (obj: any, path: string[]) => {
    if (!obj) return;
    if (typeof obj === 'string' && obj.startsWith('http')) {
      list.push({ path, url: obj });
    } else if (typeof obj === 'object' && obj.url && typeof obj.url === 'string' && obj.url.startsWith('http')) {
      list.push({ path: [...path, 'url'], url: obj.url });
    }
  };

  // 1. App Branding
  if (data.app_branding) {
    addImage(data.app_branding.logo_primary, ['app_branding', 'logo_primary']);
    addImage(data.app_branding.logo_secondary, ['app_branding', 'logo_secondary']);
  }
  // 2. Popup Content
  if (data.popup_content) {
    addImage(data.popup_content.popup_image, ['popup_content', 'popup_image']);
  }
  // 3. Home Screen
  if (data.home_screen?.featured_event && Array.isArray(data.home_screen.featured_event)) {
    data.home_screen.featured_event.forEach((ev: any, idx: number) => {
      addImage(ev.thumbnail_image, ['home_screen', 'featured_event', String(idx), 'thumbnail_image']);
    });
  }
  if (data.home_screen?.programs && Array.isArray(data.home_screen.programs)) {
    data.home_screen.programs.forEach((prog: any, idx: number) => {
      addImage(prog.thumbnail_image, ['home_screen', 'programs', String(idx), 'thumbnail_image']);
    });
  }

  // 4. Programs
  if (data.programs && Array.isArray(data.programs)) {
    data.programs.forEach((prog: any, idx: number) => {
      addImage(prog.thumbnail_image, ['programs', String(idx), 'thumbnail_image']);
    });
  }
  // 5. Events
  if (data.events && Array.isArray(data.events)) {
    data.events.forEach((ev: any, idx: number) => {
      addImage(ev.thumbnail_image, ['events', String(idx), 'thumbnail_image']);
    });
  }
  // 6. Trails
  if (data.trails && Array.isArray(data.trails)) {
    data.trails.forEach((trail: any, idx: number) => {
      addImage(trail.featured_image, ['trails', String(idx), 'featured_image']);
    });
  }
  // 7. Rentals
  if (data.rentals && Array.isArray(data.rentals)) {
    data.rentals.forEach((rental: any, idx: number) => {
      if (rental.additional_images && Array.isArray(rental.additional_images) && rental.additional_images.length > 0) {
        addImage(rental.additional_images[0], ['rentals', String(idx), 'additional_images', '0']);
      }
    });
  }
  // 8. Tips
  if (data.tips && Array.isArray(data.tips)) {
    data.tips.forEach((tip: any, idx: number) => {
      addImage(tip.tip_icon__image, ['tips', String(idx), 'tip_icon__image']);
    });
  }
  // 9. Plan Your Trip
  if (data.plan_your_trip) {
    addImage(data.plan_your_trip.hero_image, ['plan_your_trip', 'hero_image']);
    if (data.plan_your_trip.sections && Array.isArray(data.plan_your_trip.sections)) {
      data.plan_your_trip.sections.forEach((sec: any, idx: number) => {
        addImage(sec.section_icon, ['plan_your_trip', 'sections', String(idx), 'section_icon']);
      });
    }
  }
  // 10. POIs (waypoints)
  if (data.pois && Array.isArray(data.pois)) {
    data.pois.forEach((poi: any, idx: number) => {
      addImage(poi.featured_image, ['pois', String(idx), 'featured_image']);
      addImage(poi.pin_icon_override, ['pois', String(idx), 'pin_icon_override']);
    });
  }
  // 11. Tips Screen Settings
  if (data.tips_screen_settings) {
    addImage(data.tips_screen_settings.header_icon, ['tips_screen_settings', 'header_icon']);
  }
  // 12. Cameras
  if (data.cameras && Array.isArray(data.cameras)) {
    data.cameras.forEach((cam: any, idx: number) => {
      addImage(cam.thumbnail__poster, ['cameras', String(idx), 'thumbnail__poster']);
    });
  }
  // 13. Visitors
  if (data.visitors) {
    addImage(data.visitors.hero_image, ['visitors', 'hero_image']);
  }

  return list;
}

export async function fetchAndStoreAll(
  onProgress?: (progress: number, status: string) => void
): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    console.warn('[Sync] No network connection available for initial sync.');
    return false;
  }

  try {
    if (onProgress) onProgress(0.05, 'Fetching content data...');
    const timestamp = new Date().getTime();
    const baseUrl = process.env.EXPO_PUBLIC_SITE_URL;
    const response = await fetchWithTimeout(`${baseUrl}/elk/wp-json/elk/v1/data?_t=${timestamp}&sync=full`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept': 'application/json',
        'User-Agent': 'ElkMobileApp/1.0'
      }
    }, 30000);

    if (!response.ok) {
      throw new Error(`API response error: ${response.status}`);
    }

    const text = await response.text();
    let json: any;
    let serverSyncTime: string | null = null;
    try {
      json = JSON.parse(text);
      // Support new API format where everything is nested under a "data" object
      if (json && json.data && typeof json.data === 'object' && !json.app_branding) {
        serverSyncTime = json.sync_time || null;
        json = json.data;
      }
    } catch (e) {
      throw new Error('Invalid JSON response from API');
    }

    if (onProgress) onProgress(0.2, 'Preparing image downloads...');

    // Pre-cache featured images for all records via unified imageCache (manifest + LRU)
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

    // Atomic transactional SQLite commit — stores last_modified per record
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM app_records;');
      db.runSync('DELETE FROM app_settings;');

      const settingsKeys = [
        'app_branding', 'popup_content', 'home_screen', 'plan_your_trip',
        'visitors', 'programs_setting', 'event_settings', 'live_cam_settings',
        'trail_settings', 'rental_settings', 'tips_screen_settings',
        'map_settings', 'navigation'
      ];
      for (const key of settingsKeys) {
        if (json[key]) {
          db.runSync(
            'INSERT OR REPLACE INTO app_settings (key, json_data) VALUES (?, ?);',
            [key, JSON.stringify(json[key])]
          );
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
          item.array.forEach((rec: any) => {
            const id = rec.id ? String(rec.id) : String(Math.random());
            // Store last_modified from record if present, otherwise use content hash
            const lastModified = rec.last_modified || rec.modified || hashString(JSON.stringify(rec));
            db.runSync(
              'INSERT OR REPLACE INTO app_records (id, type, json_data, last_modified) VALUES (?, ?, ?, ?);',
              [id, item.type, JSON.stringify(rec), lastModified]
            );
          });
        }
      }

      const finalSyncTime = serverSyncTime || String(Date.now());
      db.runSync("INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?);", ['last_sync_time', finalSyncTime]);
      db.runSync("INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?);", ['is_sync_complete', 'true']);
    });

    if (onProgress) onProgress(1.0, 'Complete!');
    console.log('[Sync] Initial sync committed successfully.');
    return true;
  } catch (e) {
    console.error('[Sync] Critical failure during initial sync:', e);
    return false;
  }
}

// --- Delta sync helpers ---

// Load a map of { "type:id" -> last_modified } from local SQLite
function loadLocalModifiedMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const rows = db.getAllSync('SELECT id, type, last_modified FROM app_records;') as { id: string; type: string; last_modified: string }[];
    for (const row of rows) {
      map.set(`${row.type}:${row.id}`, row.last_modified || '');
    }
  } catch (e) {
    console.warn('[Sync] Could not load local modified map:', e);
  }
  return map;
}

// Background / Foreground delta sync trigger — per-record last_modified comparison
export async function triggerDeltaSync(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return false;

  try {
    const timestamp = new Date().getTime();
    const lastSyncStr = getLastSyncMetadata('last_sync_time');
    let lastSyncQuery = '';

    if (lastSyncStr) {
      // Check if it's already an ISO string (like 2026-07-29T12:10:49) or a numeric string (milliseconds)
      const isNumeric = /^\d+$/.test(lastSyncStr);
      let iso = lastSyncStr;
      if (isNumeric) {
        iso = new Date(parseInt(lastSyncStr, 10)).toISOString().split('.')[0];
      }
      lastSyncQuery = `&sync=incremental&last_sync=${encodeURIComponent(iso)}`;
    }

    const baseUrl = process.env.EXPO_PUBLIC_SITE_URL;
    const apiUrl = `${baseUrl}/elk/wp-json/elk/v1/data?_t=${timestamp}${lastSyncQuery}`;

    const response = await fetchWithTimeout(apiUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept': 'application/json',
        'User-Agent': 'ElkMobileApp/1.0'
      }
    }, 30000);

    if (!response.ok) return false;

    const text = await response.text();
    let json = JSON.parse(text);
    let serverSyncTime: string | null = null;

    // Support new API format where everything is nested under a "data" object
    if (json && json.data && typeof json.data === 'object' && !json.app_branding) {
      serverSyncTime = json.sync_time || null;
      json = json.data;
    }

    // Build map of locally stored last_modified values
    const localMap = loadLocalModifiedMap();

    // Determine which CPT records have changed
    const recordTypes = [
      { type: 'programs', array: json.programs },
      { type: 'events', array: json.events },
      { type: 'trails', array: json.trails },
      { type: 'rentals', array: json.rentals },
      { type: 'tips', array: json.tips },
      { type: 'pois', array: json.pois },
      { type: 'cameras', array: json.cameras }
    ];

    // Collect only changed records (server last_modified differs from local)
    const changedRecords: { type: string; rec: any; lastModified: string }[] = [];
    for (const item of recordTypes) {
      if (!item.array || !Array.isArray(item.array)) continue;
      for (const rec of item.array) {
        const id = rec.id ? String(rec.id) : null;
        if (!id) continue;
        const serverModified = rec.last_modified || rec.modified || hashString(JSON.stringify(rec));
        const localModified = localMap.get(`${item.type}:${id}`) || '';
        if (serverModified !== localModified) {
          changedRecords.push({ type: item.type, rec, lastModified: serverModified });
        }
      }
    }

    // Check which specific settings have changed by comparing JSON strings
    const settingsKeys = [
      'app_branding', 'popup_content', 'home_screen', 'plan_your_trip',
      'visitors', 'programs_setting', 'event_settings', 'live_cam_settings',
      'trail_settings', 'rental_settings', 'tips_screen_settings',
      'map_settings', 'navigation'
    ];

    // Load existing settings from SQLite
    const existingSettingsRows = db.getAllSync('SELECT key, json_data FROM app_settings;') as { key: string; json_data: string }[];
    const localSettingsMap = new Map<string, string>();
    for (const row of existingSettingsRows) {
      localSettingsMap.set(row.key, row.json_data || '');
    }

    const changedSettings: { key: string, data: any }[] = [];
    for (const key of settingsKeys) {
      // The PHP API returns [] for settings when they haven't changed.
      // We must ignore empty arrays for settings to prevent wiping out the local database.
      if (json[key] !== undefined && !(Array.isArray(json[key]) && json[key].length === 0)) {
        const serverJsonString = JSON.stringify(json[key]);
        const localJsonString = localSettingsMap.get(key) || '';
        if (serverJsonString !== localJsonString) {
          changedSettings.push({ key, data: json[key] });
        }
      }
    }

    if (changedRecords.length === 0 && changedSettings.length === 0) {
      console.log('[Sync] All records and settings up to date. Skipping write.');
      if (serverSyncTime) {
        db.runSync("INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?);", ['last_sync_time', serverSyncTime]);
      }
      return false;
    }

    console.log(`[Sync] ${changedRecords.length} changed record(s), ${changedSettings.length} changed setting(s) detected.`);

    // For changed records only — re-cache images via unified imageCache
    // cacheImageIfNeeded always re-downloads for changed records (updates lastAccessed + manifest)
    for (const { rec, type: recType } of changedRecords) {
      const tempJson: any = {};
      tempJson[recType] = [rec];
      const images = extractPreCacheUrls(tempJson);

      for (const item of images) {
        try {
          // Force fresh download by passing URL + true — imageCache will overwrite existing file
          const localUri = await cacheImageIfNeeded(item.url, true);
          setNestedValue(rec, item.path.slice(2), localUri);
        } catch (err) {
          console.warn(`[Sync] Failed to re-cache image for changed record:`, err);
        }
      }
    }

    // Atomic SQLite write — only upsert what changed
    db.withTransactionSync(() => {
      // Handle deleted records if provided by the incremental API
      if (json.deleted && Array.isArray(json.deleted)) {
        for (const del of json.deleted) {
          if (del.id) {
            db.runSync('DELETE FROM app_records WHERE id = ?;', [String(del.id)]);
          }
        }
      }

      // Update changed CPT records
      for (const { type: recType, rec, lastModified } of changedRecords) {
        const id = String(rec.id);
        db.runSync(
          'INSERT OR REPLACE INTO app_records (id, type, json_data, last_modified) VALUES (?, ?, ?, ?);',
          [id, recType, JSON.stringify(rec), lastModified]
        );
      }

      // Update ONLY changed settings
      for (const { key, data } of changedSettings) {
        db.runSync('INSERT OR REPLACE INTO app_settings (key, json_data) VALUES (?, ?);', [key, JSON.stringify(data)]);
      }

      const finalSyncTime = serverSyncTime || String(Date.now());
      db.runSync("INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?);", ['last_sync_time', finalSyncTime]);
    });

    console.log('[Sync] Per-record delta sync complete.');
    return true;
  } catch (e) {
    console.error('[Sync] Failed to perform delta sync:', e);
    return false;
  }
}
