/**
 * useRoutePreloader
 *
 * Fetches OSRM driving routes for every waypoint pair (N × N) and caches
 * the encoded polylines in SQLite for offline use.
 */
import { useCallback, useRef, useState } from 'react';
import { useAppContent } from '../contexts/AppContentContext';
import { hasRoute, saveRoute } from '../utils/routeDatabase';

export interface PreloadProgress {
  current: number;
  total: number;
  percentage: number;
}

export async function fetchAndCacheRoute(from: any, to: any): Promise<boolean> {
  if (!from || !to || !from.coordinate || !to.coordinate) return false;
  if (from.id === to.id) return true;

  const fromCoord = `${from.coordinate.longitude},${from.coordinate.latitude}`;
  const toCoord = `${to.coordinate.longitude},${to.coordinate.latitude}`;

  if (await hasRoute(from.id, to.id, fromCoord, toCoord)) return true;

  const osrmBase = process.env.EXPO_PUBLIC_OSRM_URL || '';
  const url = `${osrmBase.replace(/\/$/, '')}/route/v1/driving/${fromCoord};${toCoord}?geometries=polyline6&overview=full`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 429) {
      console.warn('[RoutePreloader] OSRM Rate limit hit (429). Throttling...');
      await new Promise(r => setTimeout(r, 2000));
      return false;
    }

    if (!res.ok) return false;

    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
      await saveRoute(from.id, to.id, data.routes[0].geometry, data.routes[0].duration || 0, data.routes[0].distance || 0, fromCoord, toCoord);
      return true;
    }
  } catch (err) {
    // console.warn(`[RoutePreloader] Failed to fetch route ${from.id}→${to.id}:`, err);
  }
  return false;
}

export async function preloadAllRoutesHelper(waypoints: any[], onProgress?: (p: PreloadProgress) => void, abortRef?: { current: boolean }) {
  const total = waypoints.length * waypoints.length;
  if (total === 0) return { success: true, cached: 0, total: 0 };

  let current = 0;
  let successCount = 0;
  let consecutiveFailures = 0;

  for (const from of waypoints) {
    for (const to of waypoints) {
      if (abortRef?.current) {
        return { success: false, cached: successCount, total };
      }

      const ok = await fetchAndCacheRoute(from, to);
      if (ok) {
        successCount++;
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
        if (current < 3 && consecutiveFailures >= 3) {
          return { success: false, cached: 0, total, error: 'No internet connection' };
        }
      }
      current++;

      const p: PreloadProgress = { current, total, percentage: Math.round((current / total) * 100) };
      onProgress?.(p);

      // Throttling: 100ms delay between requests to avoid rate limits
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return { success: true, cached: successCount, total };
}

export function useRoutePreloader() {
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState<PreloadProgress>({ current: 0, total: 0, percentage: 0 });
  const abortRef = useRef(false);
  const { poisData } = useAppContent();
  const waypoints = poisData || [];

  const preloadPair = useCallback(async (fromId: number, toId: number): Promise<boolean> => {
    const from = waypoints.find(w => w.id === fromId);
    const to = waypoints.find(w => w.id === toId);
    return fetchAndCacheRoute(from, to);
  }, [waypoints]);

  const preloadAll = useCallback(async (onProgress?: (p: PreloadProgress) => void) => {
    if (isPreloading) return;

    setIsPreloading(true);
    abortRef.current = false;

    const result = await preloadAllRoutesHelper(waypoints, (p) => {
      setProgress(p);
      onProgress?.(p);
    }, abortRef);

    setIsPreloading(false);
    return result;
  }, [isPreloading, waypoints]);

  const cancelPreload = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { preloadAll, preloadPair, progress, isPreloading, cancelPreload };
}
