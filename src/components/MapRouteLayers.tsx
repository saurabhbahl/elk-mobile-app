/**
 * MapRouteLayers
 *
 * Renders the three route layers on the MapLibre map:
 *  - Main scenic drive route (gold) — hidden during navigation
 *  - Orange alternate route — hidden during navigation
 *  - Active navigation route (animated snake draw)
 *
 * Keeping all GeoJSONSource / Layer declarations here keeps index.tsx clean.
 */

import React, { useEffect, useRef, useState } from 'react';

interface MapRouteLayersProps {
  GeoJSONSource: unknown;
  Layer: unknown;
  mainRouteFeature: GeoJSON.FeatureCollection;
  orangeRouteFeature: GeoJSON.FeatureCollection;
  activeRouteData: GeoJSON.FeatureCollection | null;
  routeVersion: number; // bump triggers re-render of active route
  isNavigating: boolean;
}

/**
 * Builds a partial FeatureCollection containing only the first `count` coordinates
 * of the first LineString feature. Used for the snake animation.
 */
function sliceRoute(
  full: GeoJSON.FeatureCollection,
  count: number
): GeoJSON.FeatureCollection {
  const feature = (full as Href<string>).features?.[0];
  if (!feature) return full;
  const coords: [number, number][] = feature.geometry.coordinates;
  if (coords.length < 2) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [
      {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: coords.slice(0, Math.max(2, count)),
        },
      },
    ],
  };
}

export const MapRouteLayers: React.FC<MapRouteLayersProps> = ({
  GeoJSONSource,
  Layer,
  mainRouteFeature,
  orangeRouteFeature,
  activeRouteData,
  routeVersion,
  isNavigating,
}) => {
  // ── Snake animation state ──────────────────────────────────────────────────
  const [animatedRoute, setAnimatedRoute] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevVersionRef = useRef<number>(-1);

  useEffect(() => {
    // Clear any running animation
    if (animFrameRef.current) {
      clearTimeout(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (!activeRouteData || !isNavigating) {
      setAnimatedRoute(activeRouteData);
      prevVersionRef.current = routeVersion;
      return;
    }

    // Only animate when a brand-new route arrives (routeVersion changed)
    if (routeVersion === prevVersionRef.current) {
      setAnimatedRoute(activeRouteData);
      return;
    }
    prevVersionRef.current = routeVersion;

    const totalCoords: number =
      (activeRouteData as Href<string>).features?.[0]?.geometry?.coordinates?.length ?? 0;

    if (totalCoords < 2) {
      setAnimatedRoute(null);
      return;
    }

    // Animate: draw from 2 points up to totalCoords over ~800 ms
    // Step size scales so the whole route draws in ~800 ms regardless of length.
    const DURATION_MS = 800;
    const INTERVAL_MS = 16; // ~60 fps
    const steps = Math.ceil(DURATION_MS / INTERVAL_MS);
    const increment = Math.max(1, Math.ceil(totalCoords / steps));

    let current = 2;

    const tick = () => {
      current = Math.min(current + increment, totalCoords);
      setAnimatedRoute(sliceRoute(activeRouteData, current));
      if (current < totalCoords) {
        animFrameRef.current = setTimeout(tick, INTERVAL_MS);
      }
    };

    // Start with 2 points so the line appears immediately
    setAnimatedRoute(sliceRoute(activeRouteData, 2));
    animFrameRef.current = setTimeout(tick, INTERVAL_MS);

    return () => {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
    };
  }, [activeRouteData, routeVersion, isNavigating]);

  return (
    <>
      {/* ── Main scenic drive route (gold) — hidden while navigating ── */}
      {!isNavigating && (
        <GeoJSONSource id="main-route-source" data={mainRouteFeature}>
          <Layer
            id="main-route-line"
            type="line"
            paint={{
              'line-color': '#FFD700',
              'line-width': 6,
              'line-opacity': 0.8,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>
      )}

      {/* ── Orange alternate route — hidden while navigating ── */}
      {!isNavigating && (
        <GeoJSONSource id="orange-route-source" data={orangeRouteFeature}>
          <Layer
            id="orange-route-casing"
            type="line"
            paint={{
              'line-color': '#ffffff',
              'line-width': 8,
              'line-opacity': 0.95,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          <Layer
            id="orange-route-line"
            type="line"
            paint={{
              'line-color': '#ff8a00',
              'line-width': 5,
              'line-opacity': 1,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>
      )}

      {/* ── Active navigation route (animated snake) ── */}
      {animatedRoute && (animatedRoute as Href<string>).features?.[0]?.geometry?.coordinates?.length >= 2 && (
        <GeoJSONSource id="active-route-source" data={animatedRoute}>
          <Layer
            id="active-route-casing"
            type="line"
            paint={{
              'line-color': '#ffffff',
              'line-width': 10,
              'line-opacity': 0.95,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          <Layer
            id="active-route-line"
            type="line"
            paint={{
              'line-color': '#FFD700',
              'line-width': 6,
              'line-opacity': 1,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>
      )}
    </>
  );
};
