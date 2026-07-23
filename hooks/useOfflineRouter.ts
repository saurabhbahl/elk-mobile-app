/**
 * useOfflineRouter
 *
 * Retrieves cached routes from SQLite for offline navigation.
 * Falls back to OSRM fetch when online and route not cached.
 * Falls back to straight-line distance if OSRM fails.
 */
import { useState, useCallback } from 'react';
import { waypoints } from '../data/waypoints';
import { getRoute, saveRoute } from '../utils/routeDatabase';
import { decodePolyline, calcDistance } from '../utils/mapUtils';

interface OfflineRouteResult {
  coordinates: [number, number][] | null;
  duration: number;
  distance: number;
  fromCache: boolean;
}

export function useOfflineRouter() {
  const [isLoading, setIsLoading] = useState(false);

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

      const allCoords: [number, number][] = [];
      let totalDuration = 0;
      let totalDistance = 0;
      let fromCache = true;

      for (let i = 0; i < allPoints.length - 1; i++) {
        const segmentFrom = allPoints[i];
        const segmentTo = allPoints[i + 1];

        // Only try cache for known waypoint IDs (not 999 Current Location or 888 Dropped Pin)
        const isKnownWaypoint = (id: number) => id !== 999 && id !== 888 && id > 0 && waypoints.some(w => w.id === id);
        const cached = (isKnownWaypoint(segmentFrom.id) && isKnownWaypoint(segmentTo.id))
          ? await getRoute(segmentFrom.id, segmentTo.id)
          : null;

        let polyline: string | null = null;
        let segmentDuration = 0;
        let segmentDistance = 0;

        if (cached) {
          polyline = cached.polyline;
          segmentDuration = cached.duration;
          segmentDistance = cached.distance;
          console.log(`[OfflineRouter] Using cached route ${segmentFrom.id}→${segmentTo.id} (${segmentDistance}m, ${segmentDuration}s)`);
        } else {
          fromCache = false;
          console.log(`[OfflineRouter] Route ${segmentFrom.id}→${segmentTo.id} not cached, fetching from OSRM`);
          const osrmResult = await fetchFromOSRM(segmentFrom.coord, segmentTo.coord);

          if (osrmResult && osrmResult.distance > 0) {
            polyline = osrmResult.polyline;
            segmentDuration = osrmResult.duration;
            segmentDistance = osrmResult.distance;
            // Only cache routes between known waypoints
            if (isKnownWaypoint(segmentFrom.id) && isKnownWaypoint(segmentTo.id)) {
              await saveRoute(segmentFrom.id, segmentTo.id, polyline, segmentDuration, segmentDistance);
              console.log(`[OfflineRouter] Cached route ${segmentFrom.id}→${segmentTo.id} (${segmentDistance}m, ${segmentDuration}s)`);
            }
          } else {
            console.warn(`[OfflineRouter] OSRM failed for ${segmentFrom.id}→${segmentTo.id}, using straight-line fallback`);
            // Straight-line distance fallback
            segmentDistance = calcDistance(segmentFrom.coord, segmentTo.coord);
            // Estimate duration: ~2.5 min per mile (24 mph avg)
            segmentDuration = Math.round((segmentDistance / 1609.34) * 150);
            // Create simple 2-point line for rendering.
            const fallbackCoords: [number, number][] = [
              [segmentFrom.coord.longitude, segmentFrom.coord.latitude],
              [segmentTo.coord.longitude, segmentTo.coord.latitude],
            ];
            if (allCoords.length > 0) {
              allCoords.push(...fallbackCoords.slice(1));
            } else {
              allCoords.push(...fallbackCoords);
            }
            totalDuration += segmentDuration;
            totalDistance += segmentDistance;
            continue;
          }
        }

        if (polyline) {
          const decoded = decodePolyline(polyline);
          console.log(`[OfflineRouter] Decoded ${decoded.length} points for segment ${segmentFrom.id}→${segmentTo.id}`);
          let segmentCoords: [number, number][] = decoded.map(c => [c.longitude, c.latitude]);
          if (segmentCoords.length < 2) {
            console.warn(`[OfflineRouter] Decoded route for ${segmentFrom.id}â†’${segmentTo.id} has ${segmentCoords.length} point(s), using direct segment fallback`);
            segmentCoords = [
              [segmentFrom.coord.longitude, segmentFrom.coord.latitude],
              [segmentTo.coord.longitude, segmentTo.coord.latitude],
            ];
          }

          // Calculate distance from coordinates if stored value is 0
          let coordDistance = 0;
          for (let j = 0; j < segmentCoords.length - 1; j++) {
            coordDistance += calcDistance(
              { latitude: segmentCoords[j][1], longitude: segmentCoords[j][0] },
              { latitude: segmentCoords[j + 1][1], longitude: segmentCoords[j + 1][0] }
            );
          }

          if (segmentDistance === 0 && coordDistance > 0) {
            segmentDistance = coordDistance;
            segmentDuration = Math.round((coordDistance / 1609.34) * 150);
          }

          if (allCoords.length > 0 && segmentCoords.length > 0) {
            allCoords.push(...segmentCoords.slice(1));
          } else {
            allCoords.push(...segmentCoords);
          }

          totalDuration += segmentDuration;
          totalDistance += segmentDistance;
        }
      }

      console.log(`[OfflineRouter] Total route: ${allCoords.length} points, ${totalDistance}m, ${totalDuration}s, fromCache=${fromCache}`);
      return {
        coordinates: allCoords.length > 0 ? allCoords : null,
        duration: totalDuration,
        distance: totalDistance,
        fromCache,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { getRouteBetween, isLoading };
}

async function fetchFromOSRM(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): Promise<{ polyline: string; duration: number; distance: number } | null> {
  const fromCoord = `${from.longitude},${from.latitude}`;
  const toCoord = `${to.longitude},${to.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${fromCoord};${toCoord}?geometries=polyline6&overview=full`;

  console.log(`[OSRM] Fetching: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[OSRM] HTTP error: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    console.log(`[OSRM] Response: code=${data.code}, routes=${data.routes?.length}`);

    if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
      const route = data.routes[0];
      const distance = route.distance || 0;
      const duration = route.duration || 0;

      if (distance === 0) {
        console.warn('[OSRM] Route returned 0 distance');
        return null;
      }

      console.log(`[OSRM] Route: ${distance}m, ${duration}s`);
      return {
        polyline: route.geometry,
        duration,
        distance,
      };
    } else {
      console.warn(`[OSRM] No route found: code=${data.code}, message=${data.message || 'none'}`);
    }
  } catch (err) {
    console.warn('[OfflineRouter] OSRM fetch failed:', err);
  }
  return null;
}
