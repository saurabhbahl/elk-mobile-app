import { MBTILES_FILE_PATH, SECONDARY_MBTILES_FILE_PATH } from '../hooks/useOfflineMap';

export const OFFLINE_VECTOR_SOURCE_ID = 'elk-vector-source';

// ---------------------------------------------------------------------------
// ONLINE FALLBACK — used when the MBTiles file has not been downloaded
// ---------------------------------------------------------------------------
export const ONLINE_FALLBACK_STYLE = {
  version: 8,
  name: 'Elk County Heritage Online',
  glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#eef1e7' },
    },
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm-raster',
      paint: { 'raster-opacity': 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// OFFLINE STYLE — used when MBTiles IS downloaded
//
// Glyphs:
//   MapLibre aggressively caches font PBF files after the first online use.
//   On subsequent offline sessions, the cached fonts render labels correctly.
//   If glyphs fail (first-ever offline use), MapLibre skips text labels but
//   continues rendering all fill/line layers — the map never goes blank.
//
// Layer names confirmed from elk-vector.mbtiles metadata:
//   water, waterway, landcover, landuse, park, boundary,
//   transportation, building, mountain_peak, water_name,
//   transportation_name, place, poi
// ---------------------------------------------------------------------------
export const BASE_OFFLINE_STYLE = {
  version: 8,
  name: 'Elk County Heritage Offline',
  // Glyphs are cached by MapLibre after first online use, available offline.
  glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    [OFFLINE_VECTOR_SOURCE_ID]: {
      type: 'vector',
      url: `mbtiles://${MBTILES_FILE_PATH}`,
    },
    'india-vector-source': {
      type: 'vector',
      url: `mbtiles://${SECONDARY_MBTILES_FILE_PATH}`,
    },
  },
  layers: [
    // ── Base ────────────────────────────────────────────────────────────────
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#dce8d2' },
    },

    // OSM raster: hybrid background online, silent fail offline.
    // Semi-transparent so vector always dominates.
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm-raster',
      maxzoom: 14,
      paint: { 'raster-opacity': 0.5 },
    },

    // ── Water ───────────────────────────────────────────────────────────────
    {
      id: 'water-fill',
      type: 'fill',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'water',
      paint: { 'fill-color': '#8ec8d0', 'fill-opacity': 0.9 },
    },
    {
      id: 'waterway-line',
      type: 'line',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'waterway',
      paint: { 'line-color': '#6bb5c0', 'line-width': 1.5, 'line-opacity': 0.9 },
    },

    // ── Landcover & land use ────────────────────────────────────────────────
    {
      id: 'landcover-fill',
      type: 'fill',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'landcover',
      paint: { 'fill-color': '#b9d3ad', 'fill-opacity': 0.6 },
    },
    {
      id: 'landuse-fill',
      type: 'fill',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'landuse',
      paint: { 'fill-color': '#cce8c0', 'fill-opacity': 0.5 },
    },
    {
      id: 'park-fill',
      type: 'fill',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'park',
      paint: { 'fill-color': '#a8d498', 'fill-opacity': 0.65 },
    },

    // ── Buildings ───────────────────────────────────────────────────────────
    {
      id: 'building-fill',
      type: 'fill',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'building',
      minzoom: 13,
      paint: { 'fill-color': '#d9cfba', 'fill-opacity': 0.7 },
    },

    // ── Boundaries ──────────────────────────────────────────────────────────
    {
      id: 'admin-boundaries',
      type: 'line',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'boundary',
      paint: {
        'line-color': '#8c9c84',
        'line-width': 1,
        'line-dasharray': [4, 3],
        'line-opacity': 0.7,
      },
    },

    // ── Roads ───────────────────────────────────────────────────────────────
    {
      id: 'roads-casing',
      type: 'line',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'transportation',
      paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.9 },
    },
    {
      id: 'roads-fill',
      type: 'line',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'transportation',
      paint: { 'line-color': '#c89d6a', 'line-width': 3, 'line-opacity': 0.95 },
    },
    {
      id: 'minor-roads',
      type: 'line',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 12,
      paint: { 'line-color': '#d4c49e', 'line-width': 1.5, 'line-opacity': 0.8 },
    },

    // ── Labels (require cached glyphs — see note above) ─────────────────────

    // Water body labels
    {
      id: 'water-labels',
      type: 'symbol',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'water_name',
      minzoom: 9,
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Open Sans Italic'],
        'text-size': 12,
        'text-max-width': 6,
      },
      paint: {
        'text-color': '#2e7fa0',
        'text-halo-color': '#eef1e7',
        'text-halo-width': 1.5,
      },
    },

    // Road labels
    {
      id: 'road-labels',
      type: 'symbol',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'transportation_name',
      minzoom: 12,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-padding': 2,
      },
      paint: {
        'text-color': '#4b4f46',
        'text-halo-color': '#f8faf9',
        'text-halo-width': 1.5,
      },
    },

    // Park & forest labels
    {
      id: 'park-labels',
      type: 'symbol',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'park',
      minzoom: 9,
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Open Sans Regular'],
        'text-size': 12,
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#36533a',
        'text-halo-color': '#eef1e7',
        'text-halo-width': 1.5,
      },
    },

    // POI labels (shops, amenities, etc.)
    {
      id: 'poi-labels',
      type: 'symbol',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'poi',
      minzoom: 13,
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 0.5],
        'text-max-width': 7,
      },
      paint: {
        'text-color': '#564338',
        'text-halo-color': '#f8faf9',
        'text-halo-width': 1.4,
      },
    },

    // Town / city / village / hamlet labels
    {
      id: 'place-labels',
      type: 'symbol',
      source: OFFLINE_VECTOR_SOURCE_ID,
      'source-layer': 'place',
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Open Sans Bold'],
        'text-size': 13,
        'text-max-width': 10,
      },
      paint: {
        'text-color': '#1f2d23',
        'text-halo-color': '#f8faf9',
        'text-halo-width': 2,
      },
    },
  
    // --- INDIA LAYERS (Optimized) ---
    {
      id: 'water-fill-india',
      type: 'fill',
      source: 'india-vector-source',
      'source-layer': 'water',
      paint: { 'fill-color': '#8ec8d0', 'fill-opacity': 0.6 },
    },
    {
      id: 'roads-fill-india',
      type: 'line',
      source: 'india-vector-source',
      'source-layer': 'transportation',
      paint: { 'line-color': '#c89d6a', 'line-width': 2, 'line-opacity': 0.8 },
    },
    {
      id: 'place-labels-india',
      type: 'symbol',
      source: 'india-vector-source',
      'source-layer': 'place',
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#1f2d23',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    },
  ],
};

export function getMapStyle(isDark: boolean, hasMap: boolean) {
  const base = hasMap ? BASE_OFFLINE_STYLE : ONLINE_FALLBACK_STYLE;
  
  // Deep clone the base style so we don't mutate static constants
  const style = JSON.parse(JSON.stringify(base));
  
  if (!isDark) {
    return style;
  }
  
  // Apply dark mode adjustments
  style.layers.forEach((layer: any) => {
    if (layer.id === 'background') {
      layer.paint = { 'background-color': '#111413' };
    } else if (layer.id === 'osm-base') {
      layer.paint = { 'raster-opacity': 0.25 };
    } else if (layer.id === 'water-fill' || layer.id === 'water-fill-india') {
      layer.paint = { 'fill-color': '#1d3e42', 'fill-opacity': 0.95 };
    } else if (layer.id === 'waterway-line') {
      layer.paint = { 'line-color': '#1d3e42', 'line-width': 1.5, 'line-opacity': 0.9 };
    } else if (layer.id === 'landcover-fill') {
      layer.paint = { 'fill-color': '#1b2a1a', 'fill-opacity': 0.6 };
    } else if (layer.id === 'landuse-fill') {
      layer.paint = { 'fill-color': '#182417', 'fill-opacity': 0.5 };
    } else if (layer.id === 'park-fill') {
      layer.paint = { 'fill-color': '#1b321a', 'fill-opacity': 0.65 };
    } else if (layer.id === 'building-fill') {
      layer.paint = { 'fill-color': '#2e3131', 'fill-opacity': 0.7 };
    } else if (layer.id === 'roads-casing') {
      layer.paint = { 'line-color': '#212624', 'line-width': 5, 'line-opacity': 0.9 };
    } else if (layer.id === 'roads-fill' || layer.id === 'roads-fill-india') {
      layer.paint = { 'line-color': '#8c6b45', 'line-width': 3, 'line-opacity': 0.95 };
    } else if (layer.id === 'minor-roads') {
      layer.paint = { 'line-color': '#423d30', 'line-width': 1.5, 'line-opacity': 0.8 };
    } else if (layer.id === 'water-labels') {
      layer.paint = { 'text-color': '#8ec8d0', 'text-halo-color': '#111413', 'text-halo-width': 1.5 };
    } else if (layer.id === 'road-labels') {
      layer.paint = { 'text-color': '#c3c8c1', 'text-halo-color': '#111413', 'text-halo-width': 1.5 };
    } else if (layer.id === 'park-labels') {
      layer.paint = { 'text-color': '#a8d498', 'text-halo-color': '#111413', 'text-halo-width': 1.5 };
    } else if (layer.id === 'poi-labels') {
      layer.paint = { 'text-color': '#ddc1b3', 'text-halo-color': '#111413', 'text-halo-width': 1.4 };
    } else if (layer.id === 'place-labels' || layer.id === 'place-labels-india') {
      layer.paint = { 'text-color': '#eff1f0', 'text-halo-color': '#111413', 'text-halo-width': 2 };
    } else if (layer.id === 'territory-labels') {
      layer.paint = { 'text-color': '#a8d498', 'text-halo-color': '#111413', 'text-halo-width': 2, 'text-opacity': 0.55 };
    }
  });
  
  return style;
}
