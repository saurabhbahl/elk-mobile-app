/**
 * useRoutePreloader
 *
 * Fetches OSRM driving routes for every waypoint pair (N × N) and caches
 * the encoded polylines in SQLite for offline use.
 */
import { useState, useCallback, useRef } from 'react';
import { useAppContent } from '../contexts/AppContentContext';
import { saveRoute, hasRoute } from '../utils/routeDatabase';

interface PreloadProgress {
  current: number;
  total: number;
  percentage: number;
}

export function useRoutePreloader() {
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState<PreloadProgress>({ current: 0, total: 0, percentage: 0 });
  const abortRef = useRef(false);
  const { poisData } = useAppContent();
  const waypoints = poisData || [];

  const fetchAndCache = useCallback(async (fromId: number, toId: number): Promise<boolean> => {
    const from = waypoints.find(w => w.id === fromId);
    const to = waypoints.find(w => w.id === toId);
    if (!from || !to) return false;

    if (await hasRoute(fromId, toId)) return true;

    const fromCoord = `${from.coordinate.longitude},${from.coordinate.latitude}`;
    const toCoord = `${to.coordinate.longitude},${to.coordinate.latitude}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${fromCoord};${toCoord}?geometries=polyline6&overview=full`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
        await saveRoute(fromId, toId, data.routes[0].geometry);
        return true;
      }
    } catch (err) {
      console.warn(`[RoutePreloader] Failed to fetch route ${fromId}→${toId}:`, err);
    }
    return false;
  }, [waypoints]);

  const preloadPair = useCallback(async (fromId: number, toId: number): Promise<boolean> => {
    return fetchAndCache(fromId, toId);
  }, [fetchAndCache]);

  const preloadAll = useCallback(async (onProgress?: (p: PreloadProgress) => void) => {
    if (isPreloading) return;

    setIsPreloading(true);
    abortRef.current = false;

    const ids = waypoints.map(w => w.id);
    const total = ids.length * ids.length;
    let current = 0;
    let successCount = 0;
    let consecutiveFailures = 0;

    for (const fromId of ids) {
      for (const toId of ids) {
        if (abortRef.current) {
          setIsPreloading(false);
          return { success: false, cached: successCount, total };
        }

        const ok = await fetchAndCache(fromId, toId);
        if (ok) {
          successCount++;
          consecutiveFailures = 0;
        } else {
          consecutiveFailures++;
          // If first 3 requests fail, likely no internet
          if (current < 3 && consecutiveFailures >= 3) {
            setIsPreloading(false);
            return { success: false, cached: 0, total, error: 'No internet connection' };
          }
        }
        current++;

        const p: PreloadProgress = { current, total, percentage: Math.round((current / total) * 100) };
        setProgress(p);
        onProgress?.(p);

        if (current % 10 === 0) {
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }

    setIsPreloading(false);
    return { success: true, cached: successCount, total };
  }, [isPreloading, fetchAndCache, waypoints]);

  const cancelPreload = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { preloadAll, preloadPair, progress, isPreloading, cancelPreload };
}
