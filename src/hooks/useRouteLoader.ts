/**
 * useRouteLoader
 *
 * Loads the main scenic drive route and the orange alternate route.
 * Uses bundled static polylines (already road-following) as the initial state,
 * then optionally upgrades to fresh OSRM data in the background.
 */

import { safeStorage as AsyncStorage } from '../utils/asyncStorage';
import { useEffect, useState } from 'react';
import { Coordinate } from '../data/waypoints';
import { decodePolyline } from '../utils/mapUtils';

// Import the bundled static route polylines
// These are encoded polyline6 strings representing real road geometry
import * as staticRoutes from '../../assets/static_routes.json';

// Cache keys - bump version to bust stale cache
const MAIN_ROUTE_KEY = 'main_route_v6';
const ORANGE_ROUTE_KEY = 'orange_route_v6';

// Bounds check for Pennsylvania + surrounding area
const BOUNDS = { minLat: 38, maxLat: 44, minLng: -83, maxLng: -73 };

function isValidRoute(coords: Coordinate[] | undefined | null): boolean {
  if (!Array.isArray(coords) || coords.length < 50) return false;
  return coords.every(c =>
    Number.isFinite(c?.latitude) && Number.isFinite(c?.longitude) &&
    c.latitude >= BOUNDS.minLat && c.latitude <= BOUNDS.maxLat &&
    c.longitude >= BOUNDS.minLng && c.longitude <= BOUNDS.maxLng
  );
}

/**
 * Decode polyline and validate. Returns null on failure.
 */
function tryDecode(polyline: string | undefined | null): Coordinate[] | null {
  if (!polyline || typeof polyline !== 'string') return null;
  try {
    const coords = decodePolyline(polyline);
    if (isValidRoute(coords)) return coords;
    console.warn('[useRouteLoader] Decoded coords invalid, count:', coords?.length);
    return null;
  } catch (e) {
    console.warn('[useRouteLoader] Decode error:', e);
    return null;
  }
}

export const useRouteLoader = () => {
  // ── Initialize from bundled static polylines synchronously ──────────────────
  // This ensures the map always shows road-following routes immediately.
  const [mainRouteCoordinates, setMainRouteCoordinates] = useState<Coordinate[]>(() => {
    const poly = (staticRoutes as Record<string, { geometry: { coordinates: [number, number][] } }>).mainRoute;
    const coords = tryDecode(poly);
    if (coords) {
      return coords;
    }
    console.error('[useRouteLoader] FAILED to decode main route from static polyline!');
    return [];
  });

  const [orangeRouteCoordinates, setOrangeRouteCoordinates] = useState<Coordinate[]>(() => {
    const poly = (staticRoutes as Record<string, { geometry: { coordinates: [number, number][] } }>).orangeRoute;
    const coords = tryDecode(poly);
    if (coords) {
      return coords;
    }
    console.error('[useRouteLoader] FAILED to decode orange route from static polyline!');
    return [];
  });

  // ── Background: check for cached OSRM route or fetch fresh ───────────────────
  useEffect(() => {
    async function maybeUpgradeRoute(
      storageKey: string,
      setCoords: React.Dispatch<React.SetStateAction<Coordinate[]>>,
      routeName: string
    ) {
      // Check AsyncStorage for previously cached OSRM route
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        if (cached) {
          const { encodedPolyline } = JSON.parse(cached);
          const coords = tryDecode(encodedPolyline);
          if (coords) {
            console.log(`[useRouteLoader] Using cached ${routeName}, points:`, coords.length);
            setCoords(coords);
            return;
          }
        }
      } catch (e) {
        console.warn(`[useRouteLoader] Cache read error for ${routeName}:`, e);
      }

      // Optionally: fetch fresh OSRM route here if you want live updates.
      // For now, the static polylines are already road-following, so skip OSRM.
      // If you want to re-enable OSRM, uncomment the block below:

      /*
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=polyline6`;
        const res = await fetch(url);
        const data = await res.json();
        const poly = data?.routes?.[0]?.geometry;
        if (poly) {
          const coords = tryDecode(poly);
          if (coords) {
            setCoords(coords);
            await AsyncStorage.setItem(storageKey, JSON.stringify({ encodedPolyline: poly }));
            return;
          }
        }
      } catch (e) {
        console.warn(`[useRouteLoader] OSRM fetch failed for ${routeName}:`, e);
      }
      */
    }

    maybeUpgradeRoute(MAIN_ROUTE_KEY, setMainRouteCoordinates, 'mainRoute');
    maybeUpgradeRoute(ORANGE_ROUTE_KEY, setOrangeRouteCoordinates, 'orangeRoute');
  }, []);

  return { mainRouteCoordinates, orangeRouteCoordinates };
};
