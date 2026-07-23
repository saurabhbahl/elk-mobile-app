/**
 * index.tsx — Map Screen
 *
 * Component-based architecture. Heavy logic lives in hooks; UI is split into
 * focused components. This file orchestrates them.
 */

import {
  EBGaramond_500Medium,
  EBGaramond_600SemiBold,
  EBGaramond_700Bold,
  useFonts,
} from '@expo-google-fonts/eb-garamond';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, isAvailableAsync } from 'expo-keep-awake';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  unstable_batchedUpdates,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Constants & theme
import { BASE_OFFLINE_STYLE, ONLINE_FALLBACK_STYLE, getMapStyle } from '../../constants/mapStyle';
import { LIGHT_COLORS, LIGHT_FONTS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

// Components
import { MapRouteLayers } from '../../components/MapRouteLayers';
import { NavigationHeader } from '../../components/NavigationHeader';
import { NavigationOverlay } from '../../components/NavigationOverlay';
import { PointDetailSheet } from '../../components/PointDetailSheet';
import { RoutePlanner } from '../../components/RoutePlanner';

// Data & utils
import { territoryLabelFeature } from '../../data/territoryLabels';
import { Waypoint, waypoints } from '../../data/waypoints';
import {
  calcDistance,
  calculateBearing,
  createLineFeature,
  decodePolyline,
  findNearestPointIndex,
  getTurnInstruction,
  toLngLat,
} from '../../utils/mapUtils';

// Hooks
import { useOfflineMap } from '../../hooks/useOfflineMap';
import { useRouteLoader } from '../../hooks/useRouteLoader';
import { useOfflineRouter } from '../../hooks/useOfflineRouter';
import { preloadRouteIndex } from '../../utils/routeLookup';
import { useMapReset, useNavigationMode } from '../_layout';
import { getRoute, saveRoute } from '../../utils/routeDatabase';

const isExpoGo = Constants.appOwnership === 'expo';
const DROP_PIN_TARGET_OFFSET_Y = 0;

/** Convert heading degrees to cardinal direction label */
function headingToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

// ── Wrapper holds the reset key ───────────────────────────────────────────────
export default function MapScreenWrapper() {
  const { mapKey } = useMapReset();
  return <MapScreen key={mapKey} />;
}

// ── MapScreen ─────────────────────────────────────────────────────────────────
function MapScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    isAvailableAsync()
      .then(available => { if (available) activateKeepAwakeAsync().catch(() => { }); })
      .catch(() => { });
  }, []);

  const { colors, fonts, isDark, setTheme } = useTheme();
  const styles = createStyles(colors, fonts, isDark);

  // ── Map engine ──────────────────────────────────────────────────────────────
  const [mapEngineError, setMapEngineError] = useState<string | null>(null);
  const [mapEngineReady, setMapEngineReady] = useState(false);
  const [mapComponents, setMapComponents] = useState<{
    Map: any; Camera: any; GeoJSONSource: any;
    Layer: any; Marker: any; UserLocation: any;
  } | null>(null);

  useEffect(() => {
    if (isExpoGo) { setMapEngineReady(true); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ML = require('@maplibre/maplibre-react-native');
      if (ML.Map && ML.Camera) {
        setMapComponents({
          Map: ML.Map, Camera: ML.Camera,
          GeoJSONSource: ML.GeoJSONSource, Layer: ML.Layer,
          Marker: ML.Marker, UserLocation: ML.UserLocation,
        });
        setMapEngineReady(true);
        preloadRouteIndex();
      } else {
        setMapEngineError(`Required components missing. Keys: ${Object.keys(ML).join(', ')}`);
      }
    } catch (e: any) {
      setMapEngineError(e.message || 'Failed to load MapLibre module');
    }
  }, []);

  // ── Fonts ───────────────────────────────────────────────────────────────────
  const [fontsLoaded] = useFonts({
    'EBGaramond-Medium': EBGaramond_500Medium,
    'EBGaramond-SemiBold': EBGaramond_600SemiBold,
    'EBGaramond-Bold': EBGaramond_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
  });

  // ── Offline map ─────────────────────────────────────────────────────────────
  const {
    hasMap, mbtilesError, downloadProgress, isDownloading,
    consentStatus, saveConsent, downloadMap, isInitializing,
  } = useOfflineMap();

  const [mapTimestamp, setMapTimestamp] = useState(Date.now());
  useEffect(() => {
    if (!isDownloading && hasMap && !isInitializing) setMapTimestamp(Date.now());
  }, [isDownloading, hasMap, isInitializing]);

  // ── Route data ──────────────────────────────────────────────────────────────
  const { mainRouteCoordinates, orangeRouteCoordinates } = useRouteLoader();
  const { getRouteBetween } = useOfflineRouter();
  const mainRouteFeature = useMemo(
    () => createLineFeature(mainRouteCoordinates), [mainRouteCoordinates]
  );
  const orangeRouteFeature = useMemo(
    () => createLineFeature(orangeRouteCoordinates), [orangeRouteCoordinates]
  );

  // Active route lives in a ref to avoid re-renders on every GPS tick.
  // routeVersion is bumped to signal MapRouteLayers to re-read the ref.
  const activeRouteRef = useRef<any>(null);
  const fullRouteRef = useRef<any>(null);
  const [routeVersion, setRouteVersion] = useState(0);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [startPoint, setStartPoint] = useState<Waypoint | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<Waypoint | null>(null);
  const [showPointPicker, setShowPointPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'start' | 'end' | 'stop'>('start');
  const [stopPoints, setStopPoints] = useState<Waypoint[]>([]);
  const [isSelectingPin, setIsSelectingPin] = useState(false);
  const [pinPickerType, setPinPickerType] = useState<'start' | 'end' | 'stop'>('start');
  const [pinPickerStopIndex, setPinPickerStopIndex] = useState<number | null>(null);
  // Center coordinate of map for drop-pin crosshair
  const [mapCenter, setMapCenter] = useState<{ lng: number; lat: number } | null>(null);
  const [dropPinPreviewCoordinate, setDropPinPreviewCoordinate] = useState<{ longitude: number; latitude: number } | null>(null);
  // User heading — Animated.Value so rotation updates without re-renders
  const headingAnim = useRef(new Animated.Value(0)).current;
  // Keep a plain ref for cardinal label (only needs to update occasionally)
  const headingRef = useRef(0);
  const [headingCardinal, setHeadingCardinal] = useState('N');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [navigationData, setNavigationData] = useState({
    distanceRemaining: '0.0 mi',
    timeRemaining: '0 min',
    arrivalTime: '--:--',
    nextInstruction: { text: 'Continue Straight', distance: '0 FT', icon: 'straight' as any },
  });
  const [showArrivalPopup, setShowArrivalPopup] = useState(false);
  const hasArrivedRef = useRef(false);

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return waypoints.filter(
      w => w.title.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectSearchResult = useCallback((wp: Waypoint) => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSelectedWaypoint(wp);
    cameraRef.current?.easeTo({
      center: [wp.coordinate.longitude, wp.coordinate.latitude],
      zoom: 14,
      duration: 800,
    });
  }, []);

  // Sync navigation mode to layout context so tab bar hides/shows
  const { setIsNavigating: setLayoutNavigating } = useNavigationMode();
  useEffect(() => {
    setLayoutNavigating(isNavigating);
  }, [isNavigating, setLayoutNavigating]);

  // ── Camera & misc refs ──────────────────────────────────────────────────────
  const cameraRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const isTappingMarker = useRef(false);
  const hasCenteredOnce = useRef(false);
  const isNavInFlightRef = useRef(false);
  const lastSliceIdx = useRef(-1);
  const lastRecalculateTime = useRef(Date.now());

  // ── Detail sheet animation ──────────────────────────────────────────────────
  const detailSheetTranslateY = useSharedValue(windowHeight);
  const detailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: detailSheetTranslateY.value }],
  }));
  const handleViewDetails = useCallback(() => {
    detailSheetTranslateY.value = withTiming(0, { duration: 350 });
  }, [detailSheetTranslateY]);
  const hideDetail = useCallback(() => {
    detailSheetTranslateY.value = withTiming(windowHeight, { duration: 300 });
  }, [detailSheetTranslateY, windowHeight]);

  // ── Default map center ──────────────────────────────────────────────────────
  const currentRegion = useMemo(() => ({
    latitude: 41.18204641777088,
    longitude: -78.09910529662405,
  }), []);

  // ── GPS tracking ────────────────────────────────────────────────────────────
  useEffect(() => {
    let posSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Position — throttled (30m / 10s) to avoid re-render storms
      posSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 30, timeInterval: 10000 },
        (loc) => {
          setLocation(loc.coords);
          if (!hasCenteredOnce.current && !selectedWaypoint) {
            cameraRef.current?.easeTo({
              center: [loc.coords.longitude, loc.coords.latitude],
              zoom: 15, duration: 1000,
            });
            hasCenteredOnce.current = true;
          }
        }
      );

      // Heading — fires on every compass change, animates smoothly via Animated.Value
      headingSubscription = await Location.watchHeadingAsync((headingData) => {
        const deg = headingData.trueHeading >= 0
          ? headingData.trueHeading
          : headingData.magHeading;
        if (deg < 0) return;

        // Shortest-path rotation to avoid spinning the long way around
        const prev = headingRef.current;
        let delta = deg - prev;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const next = prev + delta;
        headingRef.current = next;

        Animated.spring(headingAnim, {
          toValue: next,
          useNativeDriver: true,
          speed: 40,
          bounciness: 0,
        }).start();

        // Update cardinal label at most every ~5 degrees to avoid text flicker
        if (Math.abs(delta) > 5) {
          setHeadingCardinal(headingToCardinal(deg));
        }
      });
    })();

    return () => {
      posSubscription?.remove();
      headingSubscription?.remove();
    };
  }, []);

  const handleRecenter = useCallback(() => {
    const cam = cameraRef.current;
    const loc = location;
    if (!cam || !loc) return;
    cam.easeTo({ center: [loc.longitude, loc.latitude], zoom: 13, duration: 1000 });
  }, [location]);

  const fitRouteToCamera = useCallback((coords: [number, number][], duration = 1000) => {
    if (!coords.length) return;
    if (coords.length === 1) {
      cameraRef.current?.easeTo({ center: coords[0], zoom: 14, duration });
      return;
    }

    let minLng = coords[0][0], maxLng = coords[0][0];
    let minLat = coords[0][1], maxLat = coords[0][1];
    for (let i = 1; i < coords.length; i++) {
      minLng = Math.min(minLng, coords[i][0]);
      maxLng = Math.max(maxLng, coords[i][0]);
      minLat = Math.min(minLat, coords[i][1]);
      maxLat = Math.max(maxLat, coords[i][1]);
    }

    const lngSpan = Math.abs(maxLng - minLng);
    const latSpan = Math.abs(maxLat - minLat);
    if (lngSpan < 0.0004 && latSpan < 0.0004) {
      cameraRef.current?.easeTo({ center: coords[0], zoom: 15, duration });
      return;
    }

    cameraRef.current?.fitBounds(
      [minLng, minLat, maxLng, maxLat],
      {
        duration,
        padding: {
          top: insets.top + 160,
          right: 48,
          bottom: insets.bottom + 300,
          left: 48,
        },
      }
    );
  }, [insets.bottom, insets.top]);

  // ── Scenic Drive: handle navigateToWaypointId param from explore screen ─────
  const params = useLocalSearchParams();
  const hasHandledNavParam = useRef<string | false>(false);

  useFocusEffect(
    useCallback(() => {
      const waypointId = params.navigateToWaypointId;
      if (!waypointId) return;

      const id = parseInt(String(waypointId), 10);
      const destination = waypoints.find(w => w.id === id);
      if (!destination) return;
      const navRequestKey = `${id}:${params.navRequestId ?? 'initial'}`;

      if (hasHandledNavParam.current === navRequestKey || isNavigating) return;
      hasHandledNavParam.current = navRequestKey;

      (async () => {
        try {
          // Load the scenic drive route from route.json
          const routeData = await import('../../route.json');
          const encodedGeometry = routeData.routes?.[0]?.geometry;
          if (!encodedGeometry || typeof encodedGeometry !== 'string') {
            console.warn('[ScenicDrive] No route geometry found');
            return;
          }

          // Decode the polyline string to coordinates
          const decodedCoords = decodePolyline(encodedGeometry);
          const coords: [number, number][] = decodedCoords.map(c => [c.longitude, c.latitude]);

          const routeFeature = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: { id: 'scenic-drive', startWaypoint: null, endWaypoint: destination },
              geometry: {
                type: 'LineString',
                coordinates: coords,
              },
            }],
          };

          lastSliceIdx.current = -1;
          lastRecalculateTime.current = Date.now();
          fullRouteRef.current = routeFeature;
          activeRouteRef.current = routeFeature;

          // Calculate total distance from route coordinates
          let totalRouteDistance = 0;
          for (let i = 0; i < coords.length - 1; i++) {
            totalRouteDistance += calcDistance(
              { latitude: coords[i][1], longitude: coords[i][0] },
              { latitude: coords[i + 1][1], longitude: coords[i + 1][0] }
            );
          }
          const totalDistMi = totalRouteDistance / 1609.34;
          const totalDurMin = Math.round((totalRouteDistance / 1609.34) * 2.5);
          const arrivalETA = new Date(Date.now() + totalDurMin * 60000);
          const arrivalStr = arrivalETA.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

          unstable_batchedUpdates(() => {
            setRouteVersion(v => v + 1);
            setDestinationPoint(destination);
            setStartPoint({
              id: 999, title: 'Scenic Drive Start',
              coordinate: { latitude: coords[0][1], longitude: coords[0][0] },
              description: 'Starting point of the Elk Scenic Drive',
            });
            setNavigationData({
              distanceRemaining: `${totalDistMi.toFixed(1)} mi`,
              timeRemaining: `${totalDurMin} min`,
              arrivalTime: arrivalStr,
              nextInstruction: { text: 'Continue Straight', distance: `${totalDistMi.toFixed(1)} mi`, icon: 'straight' as any },
            });
            setIsNavigating(true);
            setShowPointPicker(false);
          });

          requestAnimationFrame(() => {
            fitRouteToCamera(coords, 1200);
          });
        } catch (error) {
          console.error('[ScenicDrive] Error loading route:', error);
        }
      })();
    }, [params.navigateToWaypointId, params.navRequestId, isNavigating, fitRouteToCamera])
  );

  // ── Waypoint interaction ────────────────────────────────────────────────────
  const handleWaypointPress = useCallback((waypoint: Waypoint) => {
    isTappingMarker.current = true;
    setTimeout(() => { isTappingMarker.current = false; }, 300);
    setSelectedWaypoint(waypoint);
    if (!isNavigating) { activeRouteRef.current = null; setRouteVersion(v => v + 1); }
    const index = waypoints.findIndex(w => w.id === waypoint.id);
    if (index !== -1) {
      setTimeout(() => { flatListRef.current?.scrollToIndex({ index, animated: true }); }, 100);
    }
  }, [isNavigating]);

  const handleScrollEnd = useCallback((event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
    const waypoint = waypoints[index];
    if (waypoint) {
      setSelectedWaypoint(waypoint);
      if (!isNavigating) { activeRouteRef.current = null; setRouteVersion(v => v + 1); }
      requestAnimationFrame(() => {
        cameraRef.current?.easeTo({
          center: [waypoint.coordinate.longitude, waypoint.coordinate.latitude],
          zoom: 14, duration: 800,
        });
      });
    }
  }, [isNavigating, windowWidth]);

  // ── Open route planner ──────────────────────────────────────────────────────
  // Pass an optional destination to pre-fill from the waypoint carousel card
  const handleNavigate = useCallback(async (destination?: Waypoint) => {
    setStopPoints([]);
    if (location) {
      setStartPoint({
        id: 999, title: 'Current Location',
        coordinate: { latitude: location.latitude, longitude: location.longitude },
        description: 'Your current GPS position',
      });
      setPickerType('end');
    } else {
      setStartPoint(null);
      setPickerType('start');
    }
    if (destination) {
      setDestinationPoint(destination);
    }
    setShowPointPicker(true);
  }, [location]);

  // ── Start navigation ────────────────────────────────────────────────────────
  const startActualNavigation = useCallback(async (from: Waypoint, to: Waypoint, stops: Waypoint[] = [], isRecalculating = false) => {
    if (isNavInFlightRef.current) return;
    isNavInFlightRef.current = true;
    try {
      setIsCalculatingRoute(true);

      // Build ordered list of waypoint IDs
      const allIds = [from.id, ...stops.map(s => s.id), to.id];

      // Get route from SQLite cache (falls back to OSRM if not cached)
      const result = await getRouteBetween(
        from.id,
        to.id,
        stops.map(s => s.id),
        from.coordinate,
        to.coordinate,
        stops.map(s => s.coordinate)
      );

      if (!result.coordinates || result.coordinates.length < 2) {
        alert('No route found. Please check your connection or try another destination.');
        return;
      }

      const coords = result.coordinates;

      const routeData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { id: 'active-route', startWaypoint: from, endWaypoint: to },
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        }],
      };

      lastSliceIdx.current = -1;
      lastRecalculateTime.current = Date.now();
      fullRouteRef.current = routeData;
      activeRouteRef.current = routeData;

      // Initialize stats from route result
      const totalDistMi = result.distance / 1609.34;
      const totalDurMin = Math.round(result.duration / 60);
      const arrivalETA = new Date(Date.now() + result.duration * 1000);
      const arrivalStr = arrivalETA.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      console.log(`[Navigation] Route result: distance=${result.distance}m (${totalDistMi.toFixed(1)} mi), duration=${result.duration}s (${totalDurMin} min)`);

      // Set navigation state first, then UI state
      setNavigationData({
        distanceRemaining: `${totalDistMi.toFixed(1)} mi`,
        timeRemaining: `${totalDurMin} min`,
        arrivalTime: arrivalStr,
        nextInstruction: { text: 'Continue Straight', distance: `${totalDistMi.toFixed(1)} mi`, icon: 'straight' as any },
      });

      setRouteVersion(v => v + 1);
      setDestinationPoint(to);
      setStartPoint(from);
      setIsNavigating(true);
      setShowPointPicker(false);

      if (!isRecalculating) {
        requestAnimationFrame(() => {
          fitRouteToCamera(coords, 1000);
        });
      }
    } catch (error) {
      console.error('CRASH PREVENTED in startActualNavigation:', error);
    } finally {
      setIsCalculatingRoute(false);
      setTimeout(() => { isNavInFlightRef.current = false; }, 1000);
    }
  }, [fitRouteToCamera, getRouteBetween]);

  // ── Live navigation stats update ────────────────────────────────────────────
  const stopPointsRef = useRef<Waypoint[]>([]);
  useEffect(() => { stopPointsRef.current = stopPoints; }, [stopPoints]);

  useEffect(() => {
    if (!isNavigating || !location || !fullRouteRef.current || isCalculatingRoute) return;
    try {
      const feature = fullRouteRef.current.features?.[0];
      if (!feature) return;
      const coords: [number, number][] = feature.geometry?.coordinates;
      if (!coords || coords.length === 0) return;
      const toWP = feature.properties?.endWaypoint;
      if (!toWP) return;

      const now = Date.now();
      const nearestIdx = findNearestPointIndex(location, coords);

      if (nearestIdx >= 0 && coords[nearestIdx]) {
        const nearestCoord = { longitude: coords[nearestIdx][0], latitude: coords[nearestIdx][1] };
        const distanceToPath = calcDistance(location, nearestCoord);

        // Recalculate route if off-path, but only if they are navigating from Current Location
        const OFF_PATH_THRESHOLD = 50; // meters
        const cooldownElapsed = now - lastRecalculateTime.current > 5000;
        const isCurrentLocationStart = feature.properties?.startWaypoint?.id === 999;

        if (distanceToPath > OFF_PATH_THRESHOLD) {
          if (isCurrentLocationStart && cooldownElapsed) {
            lastRecalculateTime.current = now;
            startActualNavigation(
              { id: 999, title: 'Current Location', coordinate: { latitude: location.latitude, longitude: location.longitude }, description: '' },
              toWP,
              stopPointsRef.current,
              true // isRecalculating
            );
            return;
          } else if (!isCurrentLocationStart && distanceToPath > 500) {
            // User is previewing a route and their GPS is very far away.
            // Do NOT snap progress to the end of the route (which would show 0.0 mi).
            return;
          }
        }

        // Remaining distance — sum from nearest point to end
        const remaining = coords.slice(nearestIdx);
        let totalDist = 0;
        for (let i = 0; i < remaining.length - 1; i++) {
          totalDist += calcDistance(
            { latitude: remaining[i][1], longitude: remaining[i][0] },
            { latitude: remaining[i + 1][1], longitude: remaining[i + 1][0] }
          );
        }
        const distMi = totalDist / 1609.34;
        const timeMin = Math.max(1, Math.round(distMi * 2.5));
        const arrival = new Date(Date.now() + timeMin * 60000);
        const arrivalStr = arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        // Next turn instruction — look ahead up to 2 km
        let instruction = { text: 'Continue Straight', distance: '', icon: 'straight' as any };
        if (remaining.length > 3) {
          const curBearing = calculateBearing(
            { latitude: remaining[0][1], longitude: remaining[0][0] },
            { latitude: remaining[1][1], longitude: remaining[1][0] }
          );
          let distAcc = 0;
          for (let i = 1; i < Math.min(remaining.length - 1, 80); i++) {
            const segDist = calcDistance(
              { latitude: remaining[i - 1][1], longitude: remaining[i - 1][0] },
              { latitude: remaining[i][1], longitude: remaining[i][0] }
            );
            distAcc += segDist;
            if (distAcc > 2000) break;
            const segBearing = calculateBearing(
              { latitude: remaining[i][1], longitude: remaining[i][0] },
              { latitude: remaining[i + 1][1], longitude: remaining[i + 1][0] }
            );
            const turn = getTurnInstruction(curBearing, segBearing);
            if (turn.text !== 'Continue Straight') {
              const distStr = distAcc > 400
                ? `${(distAcc / 1609.34).toFixed(1)} mi`
                : `${Math.round(distAcc * 3.28084)} ft`;
              instruction = { ...turn, distance: `In ${distStr}` };
              break;
            }
          }
          // If no turn found, show distance to next significant point
          if (!instruction.distance) {
            instruction.distance = distMi > 0.1 ? `${distMi.toFixed(1)} mi` : 'Arriving';
          }
        }

        let didSlice = false;
        if (nearestIdx !== lastSliceIdx.current) {
          lastSliceIdx.current = nearestIdx;
          didSlice = true;
          const routeSliceStart = Math.min(nearestIdx, Math.max(0, coords.length - 2));
          const activeCoords = coords.slice(routeSliceStart);
          activeRouteRef.current = {
            ...fullRouteRef.current,
            features: [{
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: activeCoords
              }
            }]
          };
        }

        // ── Destination arrival detection ──────────────────────────────
        const distToDestinationMeters = calcDistance(
          location,
          { latitude: toWP.coordinate.latitude, longitude: toWP.coordinate.longitude }
        );
        const ARRIVAL_THRESHOLD_METERS = 10; // ~164 feet
        if (distToDestinationMeters < ARRIVAL_THRESHOLD_METERS && !hasArrivedRef.current) {
          hasArrivedRef.current = true;
          setShowArrivalPopup(true);
        }

        setNavigationData(prev => {
          const next = {
            distanceRemaining: `${distMi.toFixed(1)} mi`,
            timeRemaining: `${timeMin} min`,
            arrivalTime: arrivalStr,
            nextInstruction: instruction,
          };
          if (
            !didSlice &&
            prev.distanceRemaining === next.distanceRemaining &&
            prev.timeRemaining === next.timeRemaining &&
            prev.arrivalTime === next.arrivalTime &&
            prev.nextInstruction.text === next.nextInstruction.text &&
            prev.nextInstruction.distance === next.nextInstruction.distance
          ) return prev;
          return next;
        });
      }
    } catch (err) {
      console.error('CRASH PREVENTED in NavUpdate:', err);
    }
  }, [location, isNavigating, isCalculatingRoute, startActualNavigation]);

  // ── Exit navigation ─────────────────────────────────────────────────────────
  // Do NOT call resetMap() — that unmounts the whole screen and shows the
  // initializing loader. Instead just reset local navigation state in-place.
  const handleExitNavigation = useCallback(() => {
    activeRouteRef.current = null;
    fullRouteRef.current = null;
    lastSliceIdx.current = -1;
    const waypointId = params.navigateToWaypointId;
    hasHandledNavParam.current = waypointId
      ? `${parseInt(String(waypointId), 10)}:${params.navRequestId ?? 'initial'}`
      : false;
    hasArrivedRef.current = false;
    isNavInFlightRef.current = false;
    setShowArrivalPopup(false);
    unstable_batchedUpdates(() => {
      setIsNavigating(false);
      setStartPoint(null);
      setDestinationPoint(null);
      setStopPoints([]);
      setRouteVersion(v => v + 1);
      setNavigationData({
        distanceRemaining: '0.0 mi',
        timeRemaining: '0 min',
        arrivalTime: '--:--',
        nextInstruction: { text: 'Continue Straight', distance: '0 FT', icon: 'straight' as any },
      });
    });
  }, [params.navigateToWaypointId, params.navRequestId]);

  // ── Memoized waypoint marker ────────────────────────────────────────────────
  const WaypointMarker = useMemo(() => React.memo(({
    waypoint, isSelected, onPress, Marker: MarkerComp,
  }: { waypoint: Waypoint; isSelected: boolean; onPress: (w: Waypoint) => void; Marker: any }) => (
    <MarkerComp
      key={`waypoint-${waypoint.id}`}
      id={`waypoint-${waypoint.id}`}
      lngLat={toLngLat(waypoint.coordinate)}
    >
      <TouchableOpacity onPress={() => onPress(waypoint)}>
        <View style={[styles.waypointCircle, isSelected && styles.waypointCircleSelected]}>
          <Text style={styles.waypointText}>{waypoint.id}</Text>
        </View>
      </TouchableOpacity>
    </MarkerComp>
  )), [styles]);

  // ── Waypoint card renderer ──────────────────────────────────────────────────
  const renderWaypointCard = useCallback(({ item }: { item: Waypoint }) => (
    <View style={{ width: windowWidth, paddingHorizontal: 24 }}>
      <Pressable style={styles.hotspotCard} onPress={(e) => e.stopPropagation()}>
        <View style={styles.flexCol}>
          <View style={styles.hotspotHeaderRow}>
            <View style={styles.flex1}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Digital Field Guide</Text>
              </View>
              <Text style={styles.hotspotTitle} numberOfLines={1}>{item.title}</Text>
            </View>
            <TouchableOpacity style={styles.favoriteButton}>
              <MaterialIcons name="favorite-border" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialIcons name="schedule" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.statText}>
                <Text style={styles.statLabel}>Best Viewing:{"\n"}</Text>
                <Text style={styles.statTime}>5:30 AM - 8:00 AM</Text>
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="analytics" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.statText}>
                <Text style={styles.statLabel}>Probability: {"\n"}</Text>
                <Text style={styles.statTime}>{(item.id * 7 % 40) + 50}%</Text>
              </Text>
            </View>
          </View>
          <View style={styles.featuresRow}>
            <View style={styles.featureIcons}>
              <MaterialIcons name="local-parking" size={20} color={colors.onSurfaceVariant} />
              <MaterialIcons name="wc" size={20} color={colors.onSurfaceVariant} />
              <MaterialIcons name="accessible" size={20} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.hotspotDescription} numberOfLines={1}>
              {item.description || 'A premier destination for elk viewing.'}
            </Text>
          </View>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.navigateButton} onPress={() => handleNavigate(item)}>
              <MaterialIcons name="directions" size={20} color={colors.onPrimary} />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.detailsButton} onPress={handleViewDetails}>
              <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </View>
  ), [windowWidth, handleNavigate, handleViewDetails]);

  // ── Loading / error guards ──────────────────────────────────────────────────
  if (!fontsLoaded || isInitializing || (!mapComponents && !isExpoGo)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (!isExpoGo && !mapEngineReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing Offline Map...</Text>
        {mapEngineError && (
          <Text style={{ color: 'red', marginTop: 10, fontSize: 12, paddingHorizontal: 20, textAlign: 'center' }}>
            {mapEngineError}
          </Text>
        )}
      </View>
    );
  }

  if (isExpoGo) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ textAlign: 'center', padding: 20, fontFamily: fonts.bodyMedium }}>
            MapLibre requires a native build.{'\n'}Please run: npx expo run:android
          </Text>
        </View>
      </View>
    );
  }

  if (isDownloading) {
    const pct = Math.round(downloadProgress * 100);
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Downloading Offline Map...</Text>
        <Text style={{ ...styles.loadingText, marginTop: 5, fontSize: 14, opacity: 0.8 }}>
          {downloadProgress < 0 ? 'Starting...' : `${Math.max(0, pct)}%`}
        </Text>
      </View>
    );
  }

  if (!mapComponents || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { Map, Camera, GeoJSONSource, Layer, Marker, UserLocation } = mapComponents;
  const showConsentOverlay = !hasMap && consentStatus === null && !isExpoGo;
  const showDownloadErrorOverlay = mbtilesError && !hasMap && consentStatus !== 'dismissed';
  console.log(dropPinPreviewCoordinate?.latitude, dropPinPreviewCoordinate?.longitude);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={getMapStyle(isDark, hasMap)}
        logo={false}
        attribution={false}
        compass={false}
        onPress={(event: any) => {
          if (isTappingMarker.current) return;
          if (isNavigating) return;
          setSelectedWaypoint(null);
          activeRouteRef.current = null;
          setRouteVersion(v => v + 1);
        }}
        onRegionDidChange={(feature: any) => {
          // Track map center for drop-pin crosshair
          const center = feature?.nativeEvent?.center ?? feature?.center;
          if (Array.isArray(center) && center.length === 2) {
            const [lng, lat] = center;
            setMapCenter({ lng, lat });
          }
          if (isSelectingPin) {
            const targetPixel: [number, number] = [
              windowWidth / 2,
              windowHeight / 2 + DROP_PIN_TARGET_OFFSET_Y,
            ];
            mapRef.current?.unproject(targetPixel)
              .then((targetCoordinate: [number, number]) => {
                if (Array.isArray(targetCoordinate) && targetCoordinate.length === 2) {
                  setDropPinPreviewCoordinate({
                    longitude: targetCoordinate[0],
                    latitude: targetCoordinate[1],
                  });
                }
              })
              .catch(() => { });
          }
        }}
      >
        <Camera ref={cameraRef} zoom={9} center={[currentRegion.longitude, currentRegion.latitude]} />
        {/* Built-in dot — hidden during navigation so our custom arrow takes over */}
        <UserLocation
          visible={!isNavigating}
          animated
          androidRenderMode="normal"
          showsUserHeadingIndicator
        />

        {/* Custom heading arrow shown during navigation */}
        {isNavigating && location && (
          <Marker
            id="user-heading-arrow"
            lngLat={[location.longitude, location.latitude]}
            anchor="center"
          >
            {/* Pulse ring behind the arrow */}
            <View style={styles.userArrowContainer}>
              <View style={styles.userArrowPulse} />
              <Animated.View
                style={[
                  styles.userArrowInner,
                  {
                    transform: [{
                      rotate: headingAnim.interpolate({
                        inputRange: [-720, 720],
                        outputRange: ['-720deg', '720deg'],
                      }),
                    }],
                  },
                ]}
              >
                <MaterialIcons name="navigation" size={26} color="white" />
              </Animated.View>
            </View>
          </Marker>
        )}

        {/* ── All route layers in one component ── */}
        <MapRouteLayers
          GeoJSONSource={GeoJSONSource}
          Layer={Layer}
          mainRouteFeature={mainRouteFeature as any}
          orangeRouteFeature={orangeRouteFeature as any}
          activeRouteData={activeRouteRef.current}
          routeVersion={routeVersion}
          isNavigating={isNavigating}
        />

        {/* Territory labels */}
        <GeoJSONSource id="territory-label-source" data={territoryLabelFeature}>
          <Layer
            id="territory-labels"
            type="symbol"
            layout={{
              'text-field': ['get', 'name'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 7, 12, 11, 18],
              'text-font': ['Open Sans Bold'],
              'text-letter-spacing': 0.05,
              'text-transform': 'uppercase',
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': '#4f5f4b',
              'text-halo-color': '#eef1e7',
              'text-halo-width': 2,
              'text-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.75, 10, 0.45, 12, 0],
            }}
          />
        </GeoJSONSource>

        {/* Waypoint markers */}
        {waypoints.map((wp) => (
          <WaypointMarker
            key={wp.id}
            waypoint={wp}
            isSelected={selectedWaypoint?.id === wp.id}
            onPress={handleWaypointPress}
            Marker={Marker}
          />
        ))}
      </Map>

      {/* ── Search bar + side controls (hidden during navigation and pin selection) ─ */}
      {!isNavigating && !showPointPicker && !isSelectingPin && (
        <>
          <View style={[styles.searchBarContainer, { top: insets.top + 12 }]}>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={22} color={colors.onSurfaceVariant} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search viewing areas..."
                placeholderTextColor={`${colors.onSurfaceVariant}80`}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowSearchResults(text.length > 0);
                }}
                onFocus={() => searchQuery.length > 0 && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearchResults(false); }}>
                  <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search results dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <View style={[styles.searchResultsDropdown, { top: 56 }]}>
                {searchResults.slice(0, 5).map((wp) => (
                  <TouchableOpacity
                    key={wp.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectSearchResult(wp)}
                  >
                    <MaterialIcons name="place" size={18} color={colors.primary} />
                    <View style={styles.searchResultText}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>{wp.title}</Text>
                      <Text style={styles.searchResultDesc} numberOfLines={1}>{wp.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.sideControls, { bottom: insets.bottom + (selectedWaypoint ? 245 : 0) }]}>
            <TouchableOpacity style={styles.sideButton} onPress={() => handleNavigate()}>
              <MaterialIcons name="navigation" size={24} color={colors.error} style={{ transform: [{ rotate: '45deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideButton} onPress={() => { }}>
              <MaterialIcons name="layers" size={24} color={colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideButton} onPress={handleRecenter}>
              <MaterialIcons name="my-location" size={24} color={colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideButton} onPress={() => setTheme(isDark ? 'light' : 'dark')}>
              <MaterialIcons name={isDark ? 'wb-sunny' : 'nights-stay'} size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Waypoint carousel (hidden during navigation and pin selection) ── */}
      {selectedWaypoint && !isNavigating && !showPointPicker && !isSelectingPin && (
        <View style={[styles.hotspotCardContainer, { bottom: insets.bottom - 30 }]}>
          <FlatList
            ref={flatListRef}
            data={waypoints}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            keyExtractor={(item) => `hotspot-${item.id}`}
            getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
            removeClippedSubviews
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => { flatListRef.current?.scrollToIndex({ index: info.index, animated: false }); }, 100);
            }}
            renderItem={renderWaypointCard}
          />
        </View>
      )}

      {/* ── Route planner (full-screen picker) ── */}
      <RoutePlanner
        isVisible={showPointPicker}
        startPoint={startPoint}
        destinationPoint={destinationPoint}
        stopPoints={stopPoints}
        waypoints={waypoints}
        location={location}
        isCalculatingRoute={isCalculatingRoute}
        pickerType={pickerType}
        onClose={() => setShowPointPicker(false)}
        onSetStartPoint={setStartPoint}
        onSetDestinationPoint={setDestinationPoint}
        onAddStop={(wp) => setStopPoints(prev => [...prev, wp])}
        onRemoveStop={(idx) => setStopPoints(prev => prev.filter((_, i) => i !== idx))}
        onUpdateStop={(idx, wp) => setStopPoints(prev => prev.map((s, i) => i === idx ? wp : s))}
        onSetPickerType={setPickerType}
        onSelectOnMap={async (type, stopIndex) => {
          console.log(`[DropPin] Selecting ${type}${stopIndex !== undefined ? ` #${stopIndex + 1}` : ''} on map`, {
            currentMapCenter: mapCenter,
            currentLocation: location
              ? { latitude: location.latitude, longitude: location.longitude }
              : null,
          });
          setPinPickerType(type);
          if (type === 'stop' && stopIndex !== undefined) {
            setPinPickerStopIndex(stopIndex);
          }
          setIsSelectingPin(true);
          setShowPointPicker(false);
        }}
        onStartNavigation={startActualNavigation}
      />

      {/* ── Navigation mode: premium header + HUD ── */}
      {isNavigating && (
        <>
          <NavigationHeader
            fromTitle={startPoint?.title ?? 'Starting point'}
            toTitle={destinationPoint?.title ?? 'Destination'}
            onExit={handleExitNavigation}
          />
          <NavigationOverlay
            destinationTitle={destinationPoint?.title}
            distanceRemaining={navigationData.distanceRemaining}
            timeRemaining={navigationData.timeRemaining}
            arrivalTime={navigationData.arrivalTime}
            nextInstruction={navigationData.nextInstruction}
            onExit={handleExitNavigation}
            onRecenter={handleRecenter}
          />
          {/* Compass direction badge */}
          <View style={[styles.navCompassBadge, { top: insets.top + 90 }]} pointerEvents="none">
            <Animated.View style={[styles.navCompassArrow, { transform: [{ rotate: headingAnim.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }] }]}>
              <MaterialIcons name="navigation" size={20} color="white" />
            </Animated.View>
            <Text style={styles.navCompassLabel}>{headingCardinal}</Text>
          </View>
        </>
      )}

      {/* ── Arrival popup modal ── */}
      {showArrivalPopup && (
        <View style={styles.modalOverlay}>
          <View style={styles.arrivalCard}>
            <View style={styles.arrivalIconContainer}>
              <MaterialIcons name="location-on" size={40} color={colors.onPrimary} />
            </View>
            <Text style={styles.arrivalTitle}>You've Reached Your Destination</Text>
            <Text style={styles.arrivalSubtitle}>
              {destinationPoint?.title ?? 'Your destination'}
            </Text>
            <Text style={styles.arrivalDescription}>
              Enjoy your time in elk country. Remember to follow wildlife safety guidelines and respect viewing area rules.
            </Text>
            <TouchableOpacity
              style={styles.arrivalButton}
              onPress={() => {
                setShowArrivalPopup(false);
                handleExitNavigation();
              }}
            >
              <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} />
              <Text style={styles.arrivalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Drop-pin mode: crosshair + compass + confirm/cancel ── */}
      {isSelectingPin && (
        <>
          {/* Crosshair target. Its red dot is the exact pixel converted to coordinates. */}
          <View style={styles.crosshairContainer} pointerEvents="none">
            <View style={[styles.crosshairTarget, { transform: [{ translateY: DROP_PIN_TARGET_OFFSET_Y }] }]}>
              <View style={styles.crosshairOuter}>
                <View style={styles.crosshairInner} />
              </View>
            </View>
          </View>

          {/* Top label */}
          <View style={[styles.pinLabelBar, { top: insets.top + 12 }]}>
            <MaterialIcons name="location-searching" size={18} color={colors.primary} />
            <Text style={styles.pinLabelText}>
              Move map to place {pinPickerType === 'start' ? 'start' : pinPickerType === 'stop' ? 'stop' : 'destination'}
            </Text>
          </View>

          {/* Compass direction indicator */}
          {location && (
            <View style={[styles.compassContainer, { top: insets.top + 60 }]}>
              <Animated.View style={[styles.compassArrow, { transform: [{ rotate: headingAnim.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }] }]}>
                <MaterialIcons name="navigation" size={22} color={colors.primary} />
              </Animated.View>
              <Text style={styles.compassLabel}>{headingCardinal}</Text>
            </View>
          )}

          {/* Bottom confirm / cancel */}
          <View style={[styles.pinActionBar, { bottom: insets.bottom }]}>
            <TouchableOpacity
              style={styles.pinCancelBtn}
              onPress={() => { setIsSelectingPin(false); setShowPointPicker(true); }}
            >
              <MaterialIcons name="close" size={20} color={colors.primary} />
              <Text style={styles.pinCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pinConfirmBtn}
              onPress={async () => {
                let lng = mapCenter?.lng ?? currentRegion.longitude;
                let lat = mapCenter?.lat ?? currentRegion.latitude;
                let source = mapCenter ? 'tracked-region-center' : 'default-region-center';
                const targetPixel: [number, number] = [
                  windowWidth / 2,
                  windowHeight / 2 + DROP_PIN_TARGET_OFFSET_Y,
                ];

                try {
                  const targetCoordinate = await mapRef.current?.unproject(targetPixel);
                  if (targetCoordinate && Array.isArray(targetCoordinate) && targetCoordinate.length === 2) {
                    lng = targetCoordinate[0];
                    lat = targetCoordinate[1];
                    source = 'mapRef.unproject(targetPixel)';
                  }
                } catch (e) {
                  console.warn('[DropPin] mapRef.unproject failed, using fallback center', e);
                }

                const pin: Waypoint = {
                  id: -Date.now(), title: 'Dropped Pin',
                  coordinate: { longitude: lng, latitude: lat },
                  description: 'Custom point selected on map',
                };
                setDropPinPreviewCoordinate(pin.coordinate);
                console.log('[DropPin] Confirmed dropped pin', {
                  type: pinPickerType,
                  stopIndex: pinPickerStopIndex,
                  source,
                  targetPixel,
                  targetOffsetY: DROP_PIN_TARGET_OFFSET_Y,
                  coordinate: pin.coordinate,
                  previousMapCenter: mapCenter,
                  currentLocation: location
                    ? { latitude: location.latitude, longitude: location.longitude }
                    : null,
                });
                if (pinPickerType === 'start') {
                  console.log('[DropPin] Applied as start point', pin);
                  setStartPoint(pin);
                }
                else if (pinPickerType === 'stop') {
                  if (pinPickerStopIndex !== null) {
                    // Update existing stop at the specified index
                    console.log(`[DropPin] Updated stop #${pinPickerStopIndex + 1}`, pin);
                    setStopPoints(prev => prev.map((s, i) => i === pinPickerStopIndex ? pin : s));
                  } else {
                    // Add new stop if no index specified
                    console.log('[DropPin] Added stop', pin);
                    setStopPoints(prev => [...prev, pin]);
                  }
                }
                else {
                  console.log('[DropPin] Applied as destination point', pin);
                  setDestinationPoint(pin);
                }
                setPinPickerStopIndex(null);
                setIsSelectingPin(false);
                setShowPointPicker(true);
              }}
            >
              <MaterialIcons name="check" size={20} color="white" />
              <Text style={styles.pinConfirmText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Waypoint detail sheet ── */}
      <PointDetailSheet
        selectedWaypoint={selectedWaypoint}
        detailAnimatedStyle={detailAnimatedStyle}
        userLocation={location}
        onClose={hideDetail}
        onNavigate={() => handleNavigate(selectedWaypoint ?? undefined)}
      />

      {/* ── Download consent overlay ── */}
      {showConsentOverlay && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="download-for-offline" size={32} color={colors.inversePrimary} />
            </View>
            <Text style={styles.modalTitle}>Explore Without Limits</Text>
            <Text style={styles.modalDescription}>
              Cellular signal is weak in Elk Country. Download this region now to ensure navigation and safety features work offline.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => { saveConsent('yes'); downloadMap(); }}
              >
                <Text style={styles.modalButtonTextPrimary}>Download Offline Map</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => saveConsent('dismissed')}>
                <Text style={styles.modalButtonTextSecondary}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setDontShowAgain(!dontShowAgain)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                {dontShowAgain && <MaterialIcons name="check" size={14} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>Don&apos;t show this again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Download error overlay ── */}
      {showDownloadErrorOverlay && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialIcons name="error-outline" size={48} color={colors.error} style={{ marginBottom: 20 }} />
            <Text style={styles.modalTitle}>Download Failed</Text>
            <Text style={styles.modalDescription}>
              We couldn&apos;t download the offline map data. Please check your connection and try again.
            </Text>
            <TouchableOpacity style={styles.modalButtonPrimary} onPress={downloadMap}>
              <Text style={styles.modalButtonTextPrimary}>Retry Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => saveConsent('dismissed')}>
              <Text style={styles.modalButtonTextSecondary}>Continue with Online Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    loadingText: { marginTop: 10, fontFamily: fonts.bodyMedium, color: colors.onSurfaceVariant },
    map: { ...StyleSheet.absoluteFillObject },

    // Search bar
    searchBarContainer: {
      position: 'absolute', left: 24, right: 24, zIndex: 10, alignItems: 'center',
    },
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface + 'cc', // 80% opacity
      borderRadius: 99, paddingHorizontal: 16, height: 52,
      width: '100%', maxWidth: 400,
      borderWidth: 1, borderColor: colors.outlineVariant + '1a', // 10% opacity
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 12, elevation: 4,
    },
    searchIcon: { marginRight: 12 },
    searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.onSurface, padding: 0 },
    searchResultsDropdown: {
      position: 'absolute', left: 0, right: 0, top: 56,
      backgroundColor: colors.surface + 'f7',
      borderRadius: 16,
      borderWidth: 1, borderColor: colors.outlineVariant + '33',
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.15, shadowRadius: 16, elevation: 8,
      maxHeight: 280, overflow: 'hidden',
    },
    searchResultItem: {
      flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
      borderBottomWidth: 1, borderBottomColor: colors.outlineVariant + '1a',
    },
    searchResultText: { flex: 1 },
    searchResultTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onSurface },
    searchResultDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },

    // Side controls
    sideControls: { position: 'absolute', right: 24, zIndex: 10, gap: 16 },
    sideButton: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: colors.surface + 'f2', // 95% opacity
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: colors.outlineVariant + '33', // 20% opacity
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.1, shadowRadius: 12, elevation: 4,
    },

    // Waypoint carousel
    hotspotCardContainer: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
    hotspotCard: {
      backgroundColor: colors.surface + 'f2', borderRadius: 24,
      padding: 20, height: 310,
      borderWidth: 1, borderColor: colors.outlineVariant + '33',
      shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
      shadowOpacity: isDark ? 0.3 : 0.15, shadowRadius: 24, elevation: 12,
    },
    flexCol: { flexDirection: 'column', width: '100%' },
    hotspotHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    flex1: { flex: 1 },
    badge: {
      backgroundColor: colors.tertiaryContainer, paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 99, alignSelf: 'flex-start', marginBottom: 8,
    },
    badgeText: { fontFamily: fonts.caption, fontSize: 10, color: colors.onTertiaryContainer, textTransform: 'uppercase', letterSpacing: 1.5 },
    hotspotTitle: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.primary, lineHeight: 28 },
    favoriteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: '45%' },
    statText: { fontFamily: fonts.bodyMedium, color: colors.onSurface },
    statLabel: { fontSize: 12 },
    statTime: { fontSize: 10 },
    featuresRow: { flexDirection: 'row', gap: 12, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 28, 28, 0.05)' },
    featureIcons: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    hotspotDescription: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceVariant, lineHeight: 18 },
    actionButtonsRow: { flexDirection: 'row', gap: 12 },
    navigateButton: { flex: 1, backgroundColor: colors.primary, height: 52, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    navigateButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
    detailsButton: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceContainer + '80', justifyContent: 'center', alignItems: 'center' },
    detailsButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },

    // Drop-pin crosshair
    crosshairContainer: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center', zIndex: 500,
    },
    crosshairTarget: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
    },
    crosshairOuter: {
      width: 42, height: 42, borderRadius: 21,
      borderWidth: 2.5, borderColor: colors.primary,
      backgroundColor: colors.primary + '1f', // 12% opacity
      justifyContent: 'center', alignItems: 'center',
    },
    crosshairInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.error,
      borderWidth: 2,
      borderColor: isDark ? colors.surface : 'white',
    },
    pinLabelBar: {
      position: 'absolute', left: 24, right: 24, zIndex: 600,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.surface + 'f2', // 95% opacity
      paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: 99,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.1, shadowRadius: 10, elevation: 6,
    },
    pinLabelText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary, flex: 1 },
    compassContainer: {
      position: 'absolute', right: 16, zIndex: 600,
      alignItems: 'center',
      backgroundColor: colors.surface + 'f2',
      width: 56, height: 56, borderRadius: 28,
      justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: isDark ? 0.25 : 0.12, shadowRadius: 8, elevation: 4,
      borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.08)',
    },
    compassArrow: { marginBottom: 1 },
    compassLabel: { fontFamily: fonts.caption, fontSize: 9, color: colors.primary, letterSpacing: 0.5 },
    pinActionBar: {
      position: 'absolute', left: 16, right: 16, zIndex: 600,
      flexDirection: 'row', gap: 12,
    },
    pinCancelBtn: {
      flex: 1, height: 52, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.outline,
      backgroundColor: colors.surface + 'f7',
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    },
    pinCancelText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
    pinConfirmBtn: {
      flex: 2, height: 52, borderRadius: 12,
      backgroundColor: colors.primary,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    pinConfirmText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },

    // Navigation compass badge
    navCompassBadge: {
      position: 'absolute', right: 16, zIndex: 95,
      alignItems: 'center',
      backgroundColor: colors.primary,
      width: 56, height: 56, borderRadius: 28,
      justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
    },
    navCompassArrow: { marginBottom: 1 },
    navCompassLabel: { fontFamily: fonts.caption, fontSize: 9, color: colors.onPrimary + 'cc', letterSpacing: 0.5 },

    // User heading arrow (navigation mode)
    userArrowContainer: {
      width: 48, height: 48,
      marginTop: -24, marginLeft: -24,
      justifyContent: 'center', alignItems: 'center',
    },
    userArrowPulse: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: colors.primary + '26', // 15% opacity
      borderWidth: 2, borderColor: colors.primary + '4d', // 30% opacity
    },
    userArrowInner: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
    },

    // Waypoint markers
    waypointCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: isDark ? '#111413' : 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 3, elevation: 4 },
    waypointCircleSelected: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.tertiaryContainer, borderColor: colors.primary },
    waypointText: { color: colors.onPrimary, fontSize: 12, fontWeight: 'bold' },

    // Modals
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(6, 27, 14, 0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 24 },
    modalCard: { width: '100%', maxWidth: 360, backgroundColor: colors.surface + 'f2', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant + '33', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 12 },
    modalIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontFamily: fonts.headingBold, fontSize: 32, color: colors.primary, textAlign: 'center', marginBottom: 16 },
    modalDescription: { fontFamily: fonts.body, fontSize: 16, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 24, marginBottom: 32, paddingHorizontal: 8 },
    modalActions: { width: '100%', gap: 12 },
    modalButtonPrimary: { backgroundColor: colors.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', width: '100%' },
    modalButtonTextPrimary: { color: colors.onPrimary, fontFamily: fonts.bodySemiBold, fontSize: 16 },
    modalButtonSecondary: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', width: '100%' },
    modalButtonTextSecondary: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 15 },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 32, gap: 8 },
    checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.outline, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkboxLabel: { fontFamily: fonts.caption, fontSize: 12, color: colors.onSurfaceVariant },

    // Arrival popup
    arrivalCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface + 'f7',
      borderRadius: 28,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: isDark ? 0.4 : 0.2,
      shadowRadius: 40,
      elevation: 16,
    },
    arrivalIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    arrivalTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 26,
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 32,
    },
    arrivalSubtitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.tertiary,
      textAlign: 'center',
      marginBottom: 16,
    },
    arrivalDescription: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
      paddingHorizontal: 8,
    },
    arrivalButton: {
      backgroundColor: colors.primary,
      height: 56,
      borderRadius: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    arrivalButtonText: {
      color: colors.onPrimary,
      fontFamily: fonts.bodyBold,
      fontSize: 18,
    },
  });
