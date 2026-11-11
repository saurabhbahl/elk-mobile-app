import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import { ApiService } from "../api/ApiService";
import { db } from "../database/index";
import { appRepository } from "../repositories/AppRepository";
import { isDateExpired } from "../utils/dateUtils";
import { cacheImageIfNeeded, clearImageCache } from "../utils/imageCache";

// Generate simple hash of a string
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

// Extract all image URLs from synced data to pre-cache locally for offline use
function extractPreCacheUrls(
  data: Record<string, unknown> | unknown,
): string[] {
  const urlSet = new Set<string>();

  const isImageUrl = (val: string): boolean => {
    if (typeof val !== "string" || !val.startsWith("http")) return false;
    const lower = val.toLowerCase();
    return (
      lower.includes("/wp-content/uploads/") ||
      lower.includes(".jpg") ||
      lower.includes(".jpeg") ||
      lower.includes(".png") ||
      lower.includes(".webp") ||
      lower.includes(".gif") ||
      lower.includes(".svg")
    );
  };

  const addCandidate = (val: unknown) => {
    if (!val) return;
    if (typeof val === "string") {
      if (isImageUrl(val)) urlSet.add(val);
    } else if (typeof val === "object" && val !== null) {
      const rec = val as Record<string, unknown>;
      if (typeof rec.url === "string" && isImageUrl(rec.url)) {
        urlSet.add(rec.url);
      }
      if (typeof rec.image_url === "string" && isImageUrl(rec.image_url)) {
        urlSet.add(rec.image_url);
      }
    }
  };

  // Recursively inspect any object or array to ensure no image is missed
  const traverse = (current: unknown, depth = 0) => {
    if (!current || depth > 8) return;
    if (typeof current === "string") {
      if (isImageUrl(current)) urlSet.add(current);
      return;
    }
    if (Array.isArray(current)) {
      for (const item of current) {
        traverse(item, depth + 1);
      }
      return;
    }
    if (typeof current === "object" && current !== null) {
      addCandidate(current);
      for (const key of Object.keys(current as Record<string, unknown>)) {
        traverse((current as Record<string, unknown>)[key], depth + 1);
      }
    }
  };

  traverse(data);
  return Array.from(urlSet);
}

export class SyncManager {
  private static activeSyncPromise: Promise<boolean> | null = null;
  private static progressListeners = new Set<
    (progress: number, status: string) => void
  >();

  private static notifyProgress(progress: number, status: string) {
    SyncManager.progressListeners.forEach((listener) => {
      try {
        listener(progress, status);
      } catch (err) {
        console.warn("[SyncManager] Error in progress listener:", err);
      }
    });
  }

  private static async checkIsOnline(): Promise<boolean> {
    if (Platform.OS === "web") {
      return typeof navigator !== "undefined" ? navigator.onLine : true;
    }
    const netState = await NetInfo.fetch();
    return Boolean(netState.isConnected && netState.isInternetReachable !== false);
  }

  /**
   * Fetches only app_branding from the lightweight settings endpoint for initial launch UI.
   */
  static async fetchBrandingOnly(): Promise<Record<string, unknown> | null> {
    if (SyncManager.activeSyncPromise) return null;

    try {
      const isOnline = await SyncManager.checkIsOnline();
      if (!isOnline) return null;

      const data = await ApiService.fetchEndpointData<any>("settings");
      if (!data) return null;

      const payload =
        data && data.data && typeof data.data === "object" ? data.data : data;
      const branding = payload?.app_branding;

      if (
        !branding ||
        typeof branding !== "object" ||
        Array.isArray(branding)
      ) {
        return null;
      }

      if (
        Platform.OS !== "web" &&
        !SyncManager.activeSyncPromise &&
        !SyncManager.isSyncComplete()
      ) {
        try {
          appRepository.upsertSetting("app_branding", JSON.stringify(branding));
        } catch (err) {
          console.warn("[SyncManager] Failed to save initial branding:", err);
        }
      }

      return branding as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  static async triggerDeltaSync(): Promise<boolean> {
    try {
      const isOnline = await SyncManager.checkIsOnline();
      if (!isOnline) {
        return false;
      }

      console.log("[SyncManager] Triggering background delta sync");
      const lastSyncTime = appRepository.getMetadata("last_full_sync");
      const settingsMap = appRepository.getAllSettings();

      // If lastSyncTime is missing, or critical settings like app_branding are corrupted, force full sync
      if (
        !lastSyncTime ||
        !settingsMap.app_branding ||
        (Array.isArray(settingsMap.app_branding) &&
          settingsMap.app_branding.length === 0)
      ) {
        console.log(
          "[SyncManager] Missing or corrupt local data. Forcing FULL sync.",
        );
        const res = await this.fetchAndStoreAll(undefined, false, undefined, true);
        console.log(
          "[SyncManager] Background full sync completed. Result:",
          res,
        );
        return res;
      }

      const res = await this.fetchAndStoreAll(undefined, true, lastSyncTime, true);
      console.log(
        "[SyncManager] Background delta sync completed. Result:",
        res,
      );
      return res;
    } catch (e) {
      console.error("[SyncManager] Background delta sync error:", e);
      return false;
    }
  }

  static isSyncComplete(): boolean {
    if (Platform.OS === "web") {
      return typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("@elk_web_is_sync_complete") === "true"
        : false;
    }
    return appRepository.getMetadata("is_sync_complete") === "true";
  }

  static async clearLocalCache() {
    try {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        window.localStorage
      ) {
        localStorage.removeItem("@elk_web_merged_content");
        localStorage.removeItem("@elk_web_is_sync_complete");
      }
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
    lastSyncTime?: string,
    downloadImages = true,
  ): Promise<boolean> {
    if (onProgress) {
      SyncManager.progressListeners.add(onProgress);
    }

    if (SyncManager.activeSyncPromise) {
      console.log(
        "[SyncManager] Sync already in progress, awaiting active sync...",
      );
      return SyncManager.activeSyncPromise;
    }

    const task = (async () => {
      const isOnline = await SyncManager.checkIsOnline();
      if (!isOnline) {
        throw new Error("No network connection available for initial sync");
      }

      try {
        SyncManager.notifyProgress(0.05, "Getting things ready...");

        console.log(
          "[SyncManager] Fetching split sync data from endpoints parallelly...",
        );
        const endpoints = [
          "pois",
          "programs",
          "events",
          "trails",
          "rentals",
          "tips",
          "cameras",
          "settings",
          "routes",
        ];
        const totalEndpoints = endpoints.length;
        let completedEndpoints = 0;

        const CONCURRENCY = 2;
        let endpointIndex = 0;
        const results: { endpoint: string; data: any }[] = [];

        const worker = async () => {
          while (endpointIndex < endpoints.length) {
            const idx = endpointIndex++;
            const endpoint = endpoints[idx];
            try {
              const res = await ApiService.fetchEndpointData<any>(
                endpoint,
                isDelta,
                lastSyncTime,
              );
              completedEndpoints++;
              const pct = 0.05 + (completedEndpoints / totalEndpoints) * 0.45;
              SyncManager.notifyProgress(pct, "Getting things ready...");
              results.push({ endpoint, data: res });
            } catch (err: any) {
              const isOffline =
                err?.name === "AbortError" ||
                err?.message?.includes("Aborted") ||
                err?.message?.includes("Network request failed") ||
                err?.message?.includes("offline") ||
                err?.name === "TypeError";
              if (!isOffline) {
                console.error(
                  `[SyncManager] Error fetching split endpoint ${endpoint}:`,
                  err,
                );
                console.warn(
                  `[SyncManager] Fetch failed for ${endpoint}, continuing sync with cached/empty data...`,
                );
              }
              results.push({ endpoint, data: null });
            }
          }
        };

        const workers = Array(Math.min(CONCURRENCY, endpoints.length))
          .fill(null)
          .map(() => worker());
        await Promise.all(workers);

        // Merge results into a unified structure for transaction parsing
        const mergedJson: Record<string, any> = { deleted: {} };
        let syncTime = new Date().toISOString();

        results.forEach(({ endpoint, data }) => {
          if (!data) return;

          if (data.sync_time) {
            syncTime = data.sync_time;
          }

          // Unwrap data property if wrapped by WP API
          const payload =
            data && data.data && typeof data.data === "object"
              ? data.data
              : data;

          if (endpoint === "settings") {
            Object.keys(payload).forEach((key) => {
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

        if (Platform.OS === "web") {
          try {
            if (typeof window !== "undefined" && window.localStorage) {
              localStorage.setItem(
                "@elk_web_merged_content",
                JSON.stringify(mergedJson),
              );
              localStorage.setItem("@elk_web_is_sync_complete", "true");
              localStorage.setItem("@elk_web_last_sync", syncTime);
            }
          } catch (webErr) {
            console.warn("Failed to save to web localStorage:", webErr);
          }
          SyncManager.notifyProgress(1.0, "Ready!");
          return true;
        }

        // Early save branding to SQLite so it can be loaded on the splash screen immediately
        try {
          if (
            mergedJson.app_branding &&
            (!Array.isArray(mergedJson.app_branding) ||
              mergedJson.app_branding.length > 0)
          ) {
            console.log("[SyncManager] Saving app branding settings early...");
            appRepository.upsertSetting(
              "app_branding",
              JSON.stringify(mergedJson.app_branding),
            );
          }
        } catch (err) {
          console.warn("Failed to save branding early:", err);
        }

        if (downloadImages) {
          SyncManager.notifyProgress(0.5, "Getting things ready...");
          const imagesToDownload = extractPreCacheUrls(mergedJson);
          const totalImages = imagesToDownload.length;
          let downloadedCount = 0;

          if (totalImages > 0) {
            console.log(
              `[SyncManager] Pre-caching ${totalImages} images for offline use...`,
            );
            const CONCURRENCY = 4;
            let index = 0;

            const downloadWorker = async () => {
              while (true) {
                const currentIndex = index++;
                if (currentIndex >= totalImages) break;
                const url = imagesToDownload[currentIndex];
                try {
                  await cacheImageIfNeeded(url);
                } catch (err) {
                  console.warn(
                    `[SyncManager] Failed to pre-cache image (${url}):`,
                    err,
                  );
                }

                downloadedCount++;
                const pct = 0.5 + (downloadedCount / totalImages) * 0.45;
                SyncManager.notifyProgress(pct, "Getting things ready...");
              }
            };

            const workers = Array(Math.min(CONCURRENCY, totalImages))
              .fill(null)
              .map(() => downloadWorker());
            await Promise.all(workers);
            console.log(
              `[SyncManager] Finished pre-caching ${downloadedCount}/${totalImages} images.`,
            );
          }
        }

        if (!isDelta) {
          db.withTransactionSync(() => {
            appRepository.clearAll();
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // 1. Write settings in a dedicated transaction block
        const settingsKeys = [
          "app_branding",
          "popup_content",
          "home_screen",
          "plan_your_trip",
          "visitors",
          "programs_setting",
          "event_settings",
          "live_cam_settings",
          "trail_settings",
          "rental_settings",
          "tips_screen_settings",
          "map_settings",
          "navigation",
        ];

        db.withTransactionSync(() => {
          for (const key of settingsKeys) {
            const val = mergedJson[key];
            if (val && (!Array.isArray(val) || val.length > 0)) {
              appRepository.upsertSetting(key, JSON.stringify(val));
            }
          }
        });
        await new Promise((resolve) => setTimeout(resolve, 0));

        // 2. Write record types in chunked transaction blocks yielding to UI thread
        const recordTypes = [
          { type: "pois", array: mergedJson.pois },
          { type: "programs", array: mergedJson.programs },
          { type: "events", array: mergedJson.events },
          { type: "trails", array: mergedJson.trails },
          { type: "rentals", array: mergedJson.rentals },
          { type: "tips", array: mergedJson.tips },
          { type: "cameras", array: mergedJson.cameras },
        ];

        for (const item of recordTypes) {
          if (
            item.array &&
            Array.isArray(item.array) &&
            item.array.length > 0
          ) {
            db.withTransactionSync(() => {
              (item.array as Record<string, unknown>[]).forEach(
                (rec: Record<string, unknown>) => {
                  const id = rec.id ? String(rec.id) : String(Math.random());
                  const lastModified = rec.updated_at
                    ? String(rec.updated_at)
                    : hashString(JSON.stringify(rec));
                  appRepository.upsertRecord(
                    id,
                    item.type,
                    JSON.stringify(rec),
                    lastModified,
                  );
                },
              );
            });
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // 2b. Write pre-calculated routes in a dedicated transaction block
        if (
          mergedJson.routes &&
          Array.isArray(mergedJson.routes) &&
          mergedJson.routes.length > 0
        ) {
          console.log(`[SyncManager] Saving ${mergedJson.routes.length} pre-calculated routes into SQLite...`);
          db.withTransactionSync(() => {
            if (!isDelta) {
              db.runSync("DELETE FROM routes");
            }
            (mergedJson.routes as Record<string, unknown>[]).forEach((r) => {
              const fromId = Number(r.from_id);
              const toId = Number(r.to_id);
              const polyline = String(r.encoded_polyline || "");
              const duration = Number(r.duration || 0);
              const distance = Number(r.distance || 0);
              const fromCoord = String(r.from_coord || "");
              const toCoord = String(r.to_coord || "");

              if (fromId > 0 && toId > 0 && polyline) {
                db.runSync(
                  `INSERT OR REPLACE INTO routes (from_id, to_id, encoded_polyline, duration, distance, from_coord, to_coord) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [fromId, toId, polyline, duration, distance, fromCoord, toCoord]
                );
              }
            });
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // 3. Deletions, cleanup, and metadata finalization block
        db.withTransactionSync(() => {
          if (
            isDelta &&
            mergedJson.deleted &&
            typeof mergedJson.deleted === "object"
          ) {
            const deleted = mergedJson.deleted as Record<string, unknown[]>;
            for (const item of recordTypes) {
              if (deleted[item.type] && Array.isArray(deleted[item.type])) {
                deleted[item.type].forEach((idToDel: unknown) => {
                  appRepository.deleteRecord(String(idToDel), item.type);
                });
              }
            }

            // Handle deleted route pairs
            if (Array.isArray(deleted.routes)) {
              (deleted.routes as any[]).forEach((delRoute) => {
                if (delRoute && delRoute.from_id && delRoute.to_id) {
                  db.runSync(
                    `DELETE FROM routes WHERE from_id = ? AND to_id = ?`,
                    [Number(delRoute.from_id), Number(delRoute.to_id)]
                  );
                }
              });
            }
          }

          // Cleanup expired events dynamically from database to keep SQLite clean
          SyncManager.cleanupExpiredEvents();

          appRepository.upsertMetadata("is_sync_complete", "true");
          appRepository.upsertMetadata("last_full_sync", syncTime);
        });

        SyncManager.notifyProgress(1.0, "Ready!");
        return true;
      } catch (e) {
        console.error("Fetch and store error:", e);
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
      if (visibility?.toLowerCase() !== "hide") return;

      // Purge from events table
      const records = appRepository.getAllRecords();
      if (records.events) {
        records.events.forEach((ev: any) => {
          if (SyncManager.isEventExpired(ev, visibility)) {
            appRepository.deleteRecord(String(ev.id), "events");
          }
        });
      }
    } catch (e) {
      console.warn("Error cleaning up expired events from DB:", e);
    }
  }

  static isEventExpired(
    event: any,
    pastEventsVisibility: string | undefined | null,
  ): boolean {
    if (!event) return true;
    if (pastEventsVisibility?.toLowerCase() !== "hide") return false;

    const dateStr = event["end_date_&_time"] || event["start_date_&_time"];
    if (!dateStr || typeof dateStr !== "string") return false;

    return isDateExpired(dateStr);
  }
}
