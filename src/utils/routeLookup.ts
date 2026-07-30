// utils/routeLookup.ts

type RouteGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

type RouteEntry = {
  geometry: RouteGeometry;
  distance_km: number;
  duration_min: number;
};

// Parsed synchronously once at module load time.
// This happens when the JS bundle first evaluates — before any UI renders,
// before any user interaction, so there is no frame to drop and no watchdog
// to trigger. Hermes parses this in ~100ms at bundle init on a mid-range device.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const INDEX: Record<string, RouteEntry> = require('../data/routes/route_index.json');

/**
 * No-op kept for call-site compatibility. Index is already loaded.
 */
export function preloadRouteIndex(): void {
  // intentional no-op — index is loaded at module evaluation time
}

/**
 * Get a pre-computed route between two waypoints.
 * Returns null if no route exists. Synchronous — no await needed.
 */
export function getRoute(fromId: number, toId: number): RouteEntry | null {
  return INDEX[`${fromId}_to_${toId}`] ?? null;
}

/**
 * Get just the GeoJSON geometry for rendering on MapLibre.
 * Synchronous — no await needed.
 */
export function getRouteGeometry(fromId: number, toId: number): RouteGeometry | null {
  return getRoute(fromId, toId)?.geometry ?? null;
}

/**
 * Get formatted distance and time label, e.g. "12.4 km · 15 min"
 */
export function getRouteLabel(fromId: number, toId: number): string | null {
  const route = getRoute(fromId, toId);
  if (!route) return null;
  return `${route.distance_km} km · ${route.duration_min} min`;
}
