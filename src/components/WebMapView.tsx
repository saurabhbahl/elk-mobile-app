import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Waypoint } from '../data/waypoints';

interface WebMapViewProps {
  currentRegion: { latitude: number; longitude: number };
  waypoints: Waypoint[];
  selectedWaypoint: Waypoint | null;
  onSelectWaypoint: (wp: Waypoint | null) => void;
  isDark: boolean;
  mainRouteCoordinates?: [number, number][];
  orangeRouteCoordinates?: [number, number][];
  activeRouteCoordinates?: [number, number][];
  stopPoints?: Waypoint[];
  isSelectingPin?: boolean;
  onRegionChange?: (lat: number, lng: number) => void;
  onMapClick?: () => void;
  cameraRef?: React.MutableRefObject<any>;
}

export const WebMapView: React.FC<WebMapViewProps> = ({
  currentRegion,
  waypoints,
  selectedWaypoint,
  onSelectWaypoint,
  isDark,
  mainRouteCoordinates,
  orangeRouteCoordinates,
  activeRouteCoordinates,
  stopPoints = [],
  isSelectingPin = false,
  onRegionChange,
  onMapClick,
  cameraRef,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Set up cameraRef methods on web so parent component calls like easeTo/fitBounds work
  useEffect(() => {
    if (Platform.OS !== 'web' || !cameraRef) return;

    cameraRef.current = {
      easeTo: ({ center, zoom }: { center: [number, number]; zoom?: number; duration?: number }) => {
        if (iframeRef.current && iframeRef.current.contentWindow && Array.isArray(center)) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ type: 'PAN_TO', lng: center[0], lat: center[1], zoom }),
            '*'
          );
        }
      },
      fitBounds: (bounds: [number, number, number, number]) => {
        if (iframeRef.current && iframeRef.current.contentWindow && Array.isArray(bounds)) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              type: 'FIT_BOUNDS',
              minLng: bounds[0],
              minLat: bounds[1],
              maxLng: bounds[2],
              maxLat: bounds[3],
            }),
            '*'
          );
        }
      },
    };
  }, [cameraRef]);

  // Listen to postMessage from Leaflet iframe
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'WAYPOINT_CLICK') {
          const wp = waypoints.find((w) => w.id === data.id);
          if (wp) {
            onSelectWaypoint(wp);
          }
        } else if (data.type === 'MAP_CLICK') {
          onSelectWaypoint(null);
          if (onMapClick) onMapClick();
        } else if (data.type === 'MAP_MOVE') {
          if (onRegionChange && typeof data.lat === 'number' && typeof data.lng === 'number') {
            onRegionChange(data.lat, data.lng);
          }
        }
      } catch {
        // Ignore non-json messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [waypoints, onSelectWaypoint, onMapClick, onRegionChange]);

  const htmlContent = useMemo(() => {
    const lat = currentRegion?.latitude || 41.3418;
    const lng = currentRegion?.longitude || -78.3681;

    // Tile layers matching theme
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileAttribution = isDark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    const validWaypoints = (waypoints || []).filter(
      (w) => w && w.coordinate && typeof w.coordinate.latitude === 'number' && typeof w.coordinate.longitude === 'number'
    );

    const waypointsJson = JSON.stringify(
      validWaypoints.map((w) => ({
        id: w.id,
        title: w.title,
        description: w.description,
        lat: w.coordinate.latitude,
        lng: w.coordinate.longitude,
        isSelected: selectedWaypoint?.id === w.id,
      }))
    );

    const formatPolyline = (coords?: [number, number][]) => {
      if (!Array.isArray(coords)) return '[]';
      const valid = coords.filter(
        (c) => Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number'
      );
      // c is [lng, lat] in GeoJSON/MapLibre, so Leaflet needs [lat, lng]
      return JSON.stringify(valid.map((c) => [c[1], c[0]]));
    };

    const mainRouteJson = formatPolyline(mainRouteCoordinates);
    const orangeRouteJson = formatPolyline(orangeRouteCoordinates);
    const activeRouteJson = formatPolyline(activeRouteCoordinates);

    const validStops = (stopPoints || []).filter(
      (s) => s && s.coordinate && typeof s.coordinate.latitude === 'number' && typeof s.coordinate.longitude === 'number'
    );

    const stopsJson = JSON.stringify(
      validStops.map((s, idx) => ({
        id: s.id,
        title: s.title || `Stop ${idx + 1}`,
        lat: s.coordinate.latitude,
        lng: s.coordinate.longitude,
      }))
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: ${isDark ? '#111413' : '#eef1e7'}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
    .leaflet-container { background: ${isDark ? '#111413' : '#eef1e7'} !important; width: 100% !important; height: 100% !important; }
    
    .custom-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #1B4D3E;
      border: 2px solid #FFFFFF;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      transition: all 0.2s ease;
    }
    .custom-pin-selected {
      background: #E53935 !important;
      width: 40px;
      height: 40px;
      z-index: 1000 !important;
      box-shadow: 0 6px 14px rgba(229,57,53,0.5);
    }
    .custom-pin-inner {
      width: 10px;
      height: 10px;
      background: #FFFFFF;
      border-radius: 50%;
      transform: rotate(45deg);
    }

    .stop-badge {
      background: #E65100;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      white-space: nowrap;
    }

    .leaflet-popup-content-wrapper {
      background: ${isDark ? '#1F2923' : '#FFFFFF'};
      color: ${isDark ? '#FFFFFF' : '#1A1A1A'};
      border-radius: 14px;
      padding: 6px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .leaflet-popup-tip {
      background: ${isDark ? '#1F2923' : '#FFFFFF'};
    }
    .popup-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: ${isDark ? '#FFFFFF' : '#111827'}; }
    .popup-desc { font-size: 12px; opacity: 0.8; margin-bottom: 10px; line-height: 1.4; color: ${isDark ? '#D1D5DB' : '#4B5563'}; }
    .popup-btn {
      display: inline-block;
      width: 100%;
      text-align: center;
      padding: 8px 0;
      background: #1B4D3E;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-sizing: border-box;
    }
    .popup-btn:hover {
      background: #246552;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false
    }).setView([${lat}, ${lng}], 10);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      crossOrigin: true,
      attribution: '${tileAttribution}'
    }).addTo(map);

    var waypoints = ${waypointsJson};
    var selectedId = ${selectedWaypoint ? selectedWaypoint.id : 'null'};

    if (Array.isArray(waypoints)) {
      waypoints.forEach(function(wp) {
        if (!wp || typeof wp.lat !== 'number' || typeof wp.lng !== 'number') return;
        var isSel = wp.id === selectedId;
        var iconClass = 'custom-pin' + (isSel ? ' custom-pin-selected' : '');
        var customIcon = L.divIcon({
          className: '',
          html: '<div class="' + iconClass + '"><div class="custom-pin-inner"></div></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        var marker = L.marker([wp.lat, wp.lng], { icon: customIcon }).addTo(map);

        var safeTitle = (wp.title || '').replace(/'/g, "\\'");
        var safeDesc = (wp.description || '').replace(/'/g, "\\'");
        var popupHtml = '<div class="popup-title">' + safeTitle + '</div>' +
          (safeDesc ? '<div class="popup-desc">' + safeDesc + '</div>' : '') +
          '<div class="popup-btn" onclick="selectWaypoint(' + wp.id + ')">Select Location</div>';

        marker.bindPopup(popupHtml);

        marker.on('click', function() {
          window.parent.postMessage(JSON.stringify({ type: 'WAYPOINT_CLICK', id: wp.id }), '*');
        });
      });
    }

    var stops = ${stopsJson};
    if (Array.isArray(stops)) {
      stops.forEach(function(st) {
        if (!st || typeof st.lat !== 'number' || typeof st.lng !== 'number') return;
        var stopIcon = L.divIcon({
          className: '',
          html: '<div class="stop-badge">📍 ' + (st.title || 'Stop') + '</div>',
          iconSize: [80, 24],
          iconAnchor: [40, 24]
        });
        L.marker([st.lat, st.lng], { icon: stopIcon }).addTo(map);
      });
    }

    var mainRoute = ${mainRouteJson};
    if (Array.isArray(mainRoute) && mainRoute.length >= 2) {
      try { L.polyline(mainRoute, { color: '#FFD700', weight: 4, opacity: 0.85 }).addTo(map); } catch(e) {}
    }

    var orangeRoute = ${orangeRouteJson};
    if (Array.isArray(orangeRoute) && orangeRoute.length >= 2) {
      try { L.polyline(orangeRoute, { color: '#FF8A00', weight: 3, opacity: 0.75 }).addTo(map); } catch(e) {}
    }

    var activeRoute = ${activeRouteJson};
    if (Array.isArray(activeRoute) && activeRoute.length >= 2) {
      try { L.polyline(activeRoute, { color: '#00E676', weight: 6, opacity: 0.95 }).addTo(map); } catch(e) {}
    }

    function selectWaypoint(id) {
      window.parent.postMessage(JSON.stringify({ type: 'WAYPOINT_CLICK', id: id }), '*');
    }

    map.on('click', function() {
      window.parent.postMessage(JSON.stringify({ type: 'MAP_CLICK' }), '*');
    });

    map.on('moveend', function() {
      var center = map.getCenter();
      window.parent.postMessage(JSON.stringify({ type: 'MAP_MOVE', lat: center.lat, lng: center.lng }), '*');
    });

    window.addEventListener('message', function(e) {
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'PAN_TO') {
          if (typeof data.lat === 'number' && typeof data.lng === 'number') {
            map.setView([data.lat, data.lng], data.zoom || map.getZoom());
          }
        } else if (data.type === 'FIT_BOUNDS') {
          if (typeof data.minLat === 'number' && typeof data.minLng === 'number' && typeof data.maxLat === 'number' && typeof data.maxLng === 'number') {
            map.fitBounds([[data.minLat, data.minLng], [data.maxLat, data.maxLng]], { padding: [40, 40] });
          }
        }
      } catch(err) {}
    });

    ${selectedWaypoint && selectedWaypoint.coordinate ? `map.panTo([${selectedWaypoint.coordinate.latitude}, ${selectedWaypoint.coordinate.longitude}]);` : ''}
  </script>
</body>
</html>
    `;
  }, [currentRegion, waypoints, selectedWaypoint, isDark, mainRouteCoordinates, orangeRouteCoordinates, activeRouteCoordinates, stopPoints]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      {React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: htmlContent,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
        },
        title: 'Web Map View',
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
});

export default WebMapView;
