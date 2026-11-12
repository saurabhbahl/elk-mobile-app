/**
 * useOfflineRouter
 *
 * Provides on-device offline navigation using LocalGraphRouter (powered by the
 * regional road network JSON dataset). When online and coordinates are outside
 * the offline routes dataset, falls back to live online routing (OSRM) so real road
 * curves are always displayed without showing straight lines.
 */
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useState } from 'react';
import { useAppContent } from '../contexts/AppContentContext';
import { LocalGraphRouter } from '../services/LocalGraphRouter';
import { calcDistance, decodePolyline } from '../utils/mapUtils';

interface OfflineRouteResult {
  coordinates: [number, number][] | null;
  duration: number;
  distance: number;
  fromCache: boolean;
}

export function useOfflineRouter() {
  const [isLoading, setIsLoading] = useState(false);
  const { poisData } = useAppContent();
  const waypoints = poisData || [];

  const getRouteBetween = useCallback(async (
    fromId: number,
    toId: number,
    stopIds: number[] = [],
    fromCoord?: { latitude: number; longitude: number },
    toCoord?: { latitude: number; longitude: number },
    stopCoords?: { latitude: number; longitude: number }[]
  ): Promise<OfflineRouteResult> => {
    setIsLoading(true);
    try {
      // Ensure local road network graph is fully initialized from disk
      await LocalGraphRouter.ensureInitialized();

      // Build ordered list of all points with resolved coordinates
      const allIds = [fromId, ...stopIds, toId];
      const allPoints: { id: number; coord: { latitude: number; longitude: number } }[] = [];

      for (let i = 0; i < allIds.length; i++) {
        const id = allIds[i];
        const wp = waypoints.find(w => w.id === id);
        if (wp) {
          allPoints.push({ id, coord: wp.coordinate });
        } else if (i === 0 && fromCoord) {
          allPoints.push({ id, coord: fromCoord });
        } else if (i === allIds.length - 1 && toCoord) {
          allPoints.push({ id, coord: toCoord });
        } else if (stopCoords && i > 0 && i - 1 < stopCoords.length) {
          allPoints.push({ id, coord: stopCoords[i - 1] });
        } else {
          console.warn(`[OfflineRouter] Could not resolve coordinates for point ${id} at index ${i}`);
          return { coordinates: null, duration: 0, distance: 0, fromCache: false };
        }
      }

      // Check online connectivity
      const netState = await NetInfo.fetch();
      const isOnline = !!netState.isConnected;

      // When offline, verify all selected points (Current Location, Dropped Pin, or Stops)
      // are within the Elk Country road network coverage. If any point is outside,
      // fail immediately with offline_outside_elk_country so an informative alert is displayed.
      if (!isOnline) {
        for (const pt of allPoints) {
          if (pt.coord && !LocalGraphRouter.isWithinCoverage(pt.coord)) {
            console.warn(
              `[OfflineRouter] Offline and point ${pt.id} is outside Elk Country coverage.`
            );
            throw new Error('offline_outside_elk_country');
          }
        }
      }

      const allCoords: [number, number][] = [];
      let totalDuration = 0;
      let totalDistance = 0;
      let isAllFromCache = true;

      for (let i = 0; i < allPoints.length - 1; i++) {
        const segmentFrom = allPoints[i];
        const segmentTo = allPoints[i + 1];

        const isFromInCoverage = LocalGraphRouter.isWithinCoverage(segmentFrom.coord);
        const isToInCoverage = LocalGraphRouter.isWithinCoverage(segmentTo.coord);
        const isWithinLocalCoverage = isFromInCoverage && isToInCoverage;

        let segmentCoords: [number, number][] | null = null;
        let segmentDuration = 0;
        let segmentDistance = 0;

        // Condition 1: When online and location is outside offline routes.json dataset,
        // use online routing (OSRM) so it calculates real road routes and never shows a straight line
        if (!isWithinLocalCoverage && isOnline) {
          console.log(
            `[OfflineRouter] Location outside routes.json coverage (fromCovered=${isFromInCoverage}, toCovered=${isToInCoverage}) and online. Fetching online OSRM route for ${segmentFrom.id}→${segmentTo.id}...`
          );
          const osrmResult = await fetchFromOSRM(segmentFrom.coord, segmentTo.coord);
          if (osrmResult && osrmResult.polyline) {
            const decoded = decodePolyline(osrmResult.polyline);
            if (decoded && decoded.length >= 2) {
              segmentCoords = decoded.map(c => [c.longitude, c.latitude]);
              segmentDistance = osrmResult.distance;
              segmentDuration = osrmResult.duration;
              isAllFromCache = false;
              console.log(
                `[OfflineRouter] Online OSRM route for ${segmentFrom.id}→${segmentTo.id} (${segmentDistance}m, ${segmentDuration}s, ${segmentCoords.length} pts)`
              );
            }
          }
        }

        // Condition 2: If online fetch didn't run or wasn't used: calculate via on-device LocalGraphRouter!
        if (!segmentCoords) {
          const localResult = LocalGraphRouter.calculateRoute(segmentFrom.coord, segmentTo.coord);
          if (localResult && localResult.coordinates.length >= 2) {
            segmentCoords = localResult.coordinates;
            segmentDistance = localResult.distance;
            segmentDuration = localResult.duration;
            console.log(
              `[OfflineRouter] On-device road route for ${segmentFrom.id}→${segmentTo.id} (${localResult.distance}m, ${localResult.duration}s, ${localResult.coordinates.length} pts)`
            );
          } else if (isOnline) {
            // If local graph router had an unmapped gap but device is online, fallback to online OSRM
            console.log(`[OfflineRouter] Local router gap for ${segmentFrom.id}→${segmentTo.id}, falling back to online OSRM...`);
            const osrmResult = await fetchFromOSRM(segmentFrom.coord, segmentTo.coord);
            if (osrmResult && osrmResult.polyline) {
              const decoded = decodePolyline(osrmResult.polyline);
              if (decoded && decoded.length >= 2) {
                segmentCoords = decoded.map(c => [c.longitude, c.latitude]);
                segmentDistance = osrmResult.distance;
                segmentDuration = osrmResult.duration;
                isAllFromCache = false;
              }
            }
          }
        }

        // Condition 3: Last resort fallback
        if (!segmentCoords || segmentCoords.length < 2) {
          if (!isOnline && !isWithinLocalCoverage) {
            console.warn(`[OfflineRouter] Point outside Elk Country coverage while offline for ${segmentFrom.id}→${segmentTo.id}`);
            throw new Error('offline_outside_elk_country');
          }
          console.warn(`[OfflineRouter] No road route found for ${segmentFrom.id}→${segmentTo.id}, using direct line fallback`);
          segmentDistance = calcDistance(segmentFrom.coord, segmentTo.coord);
          segmentDuration = Math.round((segmentDistance / 1609.34) * 150);
          segmentCoords = [
            [segmentFrom.coord.longitude, segmentFrom.coord.latitude],
            [segmentTo.coord.longitude, segmentTo.coord.latitude],
          ];
        }

        if (allCoords.length > 0) {
          allCoords.push(...segmentCoords.slice(1));
        } else {
          allCoords.push(...segmentCoords);
        }
        totalDuration += segmentDuration;
        totalDistance += segmentDistance;
      }

      console.log(`[OfflineRouter] Total route: ${allCoords.length} points, ${totalDistance}m, ${totalDuration}s`);
      return {
        coordinates: allCoords.length > 0 ? allCoords : null,
        duration: totalDuration,
        distance: totalDistance,
        fromCache: isAllFromCache,
      };
    } finally {
      setIsLoading(false);
    }
  }, [waypoints]);

  return { getRouteBetween, isLoading };
}

/**
 * Fetches driving route from OSRM proxy endpoint with fallback to direct public OSRM.
 */
async function fetchFromOSRM(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): Promise<{ polyline: string; duration: number; distance: number } | null> {
  const fromCoord = `${from.longitude},${from.latitude}`;
  const toCoord = `${to.longitude},${to.latitude}`;

  const urls: string[] = [];
  const osrmBase = (process.env.EXPO_PUBLIC_OSRM_URL || '').replace(/\/$/, '');
  if (osrmBase) {
    urls.push(`${osrmBase}/v1/driving/${fromCoord};${toCoord}?geometries=polyline6&overview=full`);
  }
  urls.push(`https://router.project-osrm.org/route/v1/driving/${fromCoord};${toCoord}?geometries=polyline6&overview=full`);

  for (const url of urls) {
    try {
      console.log(`[OSRM] Fetching: ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429) {
        console.warn('[OfflineRouter] OSRM Rate limit hit (429). Trying fallback...');
        continue;
      }
      if (!res.ok) {
        console.warn(`[OSRM] HTTP error: ${res.status} ${res.statusText}`);
        continue;
      }
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
        const route = data.routes[0];
        const distance = route.distance || 0;
        const duration = route.duration || 0;

        if (distance > 0) {
          console.log(`[OSRM] Route found: ${distance}m, ${duration}s`);
          return {
            polyline: route.geometry,
            duration,
            distance,
          };
        }
      }
    } catch (err) {
      console.warn(`[OSRM] Fetch failed for ${url}:`, err);
    }
  }
  return null;
}
