import AppText from "@/src/components/AppText";
/**
 * index.tsx — Map Screen
 *
 * Component-based architecture. Heavy logic lives in hooks; UI is split into
 * focused components. This file orchestrates them.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { activateKeepAwakeAsync, isAvailableAsync } from "expo-keep-awake";
import * as Location from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  unstable_batchedUpdates,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, {
  FadeInDown,
  FadeOutDown,
  interpolate,
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addOpacity, normalizeHex } from "../../src/utils/colorUtils";

// Constants & theme
import { getMapStyle } from "../../src/constants/mapStyle";
import { LIGHT_COLORS, LIGHT_FONTS } from "../../src/constants/theme";
import { useTheme } from "../../src/context/ThemeContext";

// Components
import CompassNeedle from "../../src/components/CompassNeedle";
import { MapRouteLayers } from "../../src/components/MapRouteLayers";
import Navbar from "../../src/components/Navbar";
import { NavigationHeader } from "../../src/components/NavigationHeader";
import { NavigationOverlay } from "../../src/components/NavigationOverlay";
import QuickLinks from "../../src/components/QuickLinks";
import { RoutePlanner } from "../../src/components/RoutePlanner";
import SameLocationPopup from "../../src/components/SameLocationPopup";
import SectionHeader from "../../src/components/SectionHeader";
import WebMapView from "../../src/components/WebMapView";

// Data & utils
import { territoryLabelFeature } from "../../src/data/territoryLabels";
import { Waypoint } from "../../src/data/waypoints";
import {
  calcDistance,
  calculateBearing,
  createLineFeature,
  decodePolyline,
  findNearestPointIndex,
  getOrdinal,
  getTurnInstruction,
  snapToRoute,
  toLngLat,
} from "../../src/utils/mapUtils";

// Hooks
import { useAppContent } from "../../src/contexts/AppContentContext";
import { useOfflineMap } from "../../src/hooks/useOfflineMap";
import { useOfflineRouter } from "../../src/hooks/useOfflineRouter";
import { useRouteLoader } from "../../src/hooks/useRouteLoader";
import { LocalGraphRouter, RoundaboutManeuver } from "../../src/services/LocalGraphRouter";
import { isValidData } from "../../src/utils/validation";
import { useMapReset, useNavigationMode } from "../_layout";

// ── Configurable arrival detection thresholds (in meters) ────────────────────
// Both conditions must be satisfied before marking destination as reached:
// 1. Straight-line distance from raw GPS location to destination pin <= DESTINATION_PROXIMITY_THRESHOLD_METERS
// 2. Remaining driving route path distance from current route progress to end <= REMAINING_ROUTE_THRESHOLD_METERS
export const DESTINATION_PROXIMITY_THRESHOLD_METERS = 20;
export const REMAINING_ROUTE_THRESHOLD_METERS = 20;

const isExpoGo = Constants.appOwnership === "expo";

/** Convert heading degrees to cardinal direction label */
function headingToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** Filter and return valid POI coordinates for framing the map view */
function getValidPoiCoords(pts: Waypoint[]): [number, number][] {
  if (!pts || !pts.length) return [];
  const valid = pts
    .filter((w) => {
      const lat = w?.coordinate?.latitude;
      const lng = w?.coordinate?.longitude;
      return (
        typeof lat === "number" &&
        typeof lng === "number" &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        !(Math.abs(lat) < 0.5 && Math.abs(lng) < 0.5)
      );
    })
    .map(
      (w) =>
        [w.coordinate.longitude, w.coordinate.latitude] as [number, number],
    );

  // If there are points in North America / Elk Country, prioritize them over outliers
  const naPoints = valid.filter(
    (c) => c[0] >= -170 && c[0] <= -52 && c[1] >= 14 && c[1] <= 72,
  );
  return naPoints.length > 0 ? naPoints : valid;
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
  const { poisData, mapSettingsData, brandData, apiStatus } = useAppContent();
  const waypoints = useMemo(() => poisData || [], [poisData]);
  const netInfo = useNetInfo();

  const [showHeader, setShowHeader] = useState(true);
  const headerProgress = useSharedValue(1);

  useEffect(() => {
    headerProgress.value = withTiming(showHeader ? 1 : 0, {
      duration: 420,
      easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [showHeader, headerProgress]);

  const navAreaAnimatedStyle = useAnimatedStyle(() => {
    const maxH = windowWidth >= 600 ? 600 : 450;
    return {
      maxHeight: interpolate(headerProgress.value, [0, 1], [0, maxH]),
      opacity: headerProgress.value,
      transform: [
        {
          translateY: interpolate(headerProgress.value, [0, 1], [-12, 0]),
        },
      ],
    };
  });

  const headerContainerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(headerProgress.value, [0, 1], [insets.top, 0]),
    };
  });


  useEffect(() => {
    isAvailableAsync()
      .then((available) => {
        if (available) activateKeepAwakeAsync().catch(() => { });
      })
      .catch(() => { });
  }, []);

  const { colors, fonts, isDark } = useTheme();
  const brandPrimary = normalizeHex(brandData?.brand_color_primary);
  const brandSecondary = normalizeHex(brandData?.brand_color_secondary);
  const styles = useMemo(
    () => createStyles(colors, fonts, isDark, brandPrimary, brandSecondary),
    [colors, fonts, isDark, brandPrimary, brandSecondary],
  );

  // ── Map engine ──────────────────────────────────────────────────────────────
  const [mapEngineError, setMapEngineError] = useState<string | null>(null);
  const [mapComponents] = useState<{
    Map: any;
    Camera: any;
    GeoJSONSource: any;
    Layer: any;
    Marker: any;
    UserLocation: any;
    LocationManager?: any;
  } | null>(() => {
    if (isExpoGo || Platform.OS === "web") return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ML = require("@maplibre/maplibre-react-native");
      const logMgr = ML.LogManager || ML.Logger;
      if (logMgr && typeof logMgr.onLog === "function") {
        logMgr.onLog((log: any) => {
          const msg = `${log?.message || ""} ${log?.tag || ""}`;
          if (
            msg.includes("Internet connection appears to be offline") ||
            msg.includes("Failed to load glyph") ||
            msg.includes("hostname could not be found") ||
            msg.includes("tiles.basemaps.cartocdn.com") ||
            msg.includes("MLNNetworkConfiguration") ||
            msg.includes("-1009")
          ) {
            return true; // suppress offline font/network warnings
          }
          return false;
        });
      }
      if (ML.Map && ML.Camera) {
        return {
          Map: ML.Map,
          Camera: ML.Camera,
          GeoJSONSource: ML.GeoJSONSource,
          Layer: ML.Layer,
          Marker: ML.Marker,
          UserLocation: ML.UserLocation,
          LocationManager: ML.LocationManager,
        };
      }
    } catch {
      // Handled in mount useEffect
    }
    return null;
  });

  useEffect(() => {
    if (isExpoGo || Platform.OS === "web" || mapComponents) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ML = require("@maplibre/maplibre-react-native");
      if (!ML.Map || !ML.Camera) {
        setMapEngineError(
          `Required components missing. Keys: ${Object.keys(ML).join(", ")}`,
        );
      }
    } catch (e: any) {
      setMapEngineError(e.message || "Failed to load MapLibre module");
    }
  }, [mapComponents]);

  // ── Offline map ─────────────────────────────────────────────────────────────
  const {
    hasMap,
    mbtilesError,
    downloadProgress,
    isDownloading,
    consentStatus,
    saveConsent,
    downloadMap,
    cancelDownload,
    isInitializing,
    downloadedMapFiles,
  } = useOfflineMap();

  const [mapTimestamp, setMapTimestamp] = useState(Date.now());
  useEffect(() => {
    if (!isDownloading && hasMap && !isInitializing)
      setMapTimestamp(Date.now());
  }, [isDownloading, hasMap, isInitializing]);

  // ── Route data ──────────────────────────────────────────────────────────────
  const { mainRouteCoordinates, orangeRouteCoordinates } = useRouteLoader();
  const { getRouteBetween } = useOfflineRouter();
  const mainRouteFeature = useMemo(
    () => createLineFeature(mainRouteCoordinates),
    [mainRouteCoordinates],
  );
  const orangeRouteFeature = useMemo(
    () => createLineFeature(orangeRouteCoordinates),
    [orangeRouteCoordinates],
  );

  // Active route lives in a ref to avoid re-renders on every GPS tick.
  // routeVersion is bumped to signal MapRouteLayers to re-read the ref.
  const activeRouteRef = useRef<any>(null);
  const fullRouteRef = useRef<any>(null);
  const [routeVersion, setRouteVersion] = useState(0);
  const [activeNavRouteData, setActiveNavRouteData] = useState<any>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(
    null,
  );
  const [highlightedRoute, setHighlightedRoute] = useState<
    "main" | "orange" | null
  >(null);
  const [location, setLocation] = useState<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const isNavigatingRef = useRef(false);
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [startPoint, setStartPoint] = useState<Waypoint | null>(null);
  const startPointRef = useRef(startPoint);
  startPointRef.current = startPoint;
  const [destinationPoint, setDestinationPoint] = useState<Waypoint | null>(
    null,
  );
  const [showPointPicker, setShowPointPicker] = useState(false);
  const [pickerType, setPickerType] = useState<"start" | "end" | "stop">(
    "start",
  );
  const [stopPoints, setStopPoints] = useState<Waypoint[]>([]);
  const [isSelectingPin, setIsSelectingPin] = useState(false);
  const isSelectingPinRef = useRef(false); // always current, safe to read in map event closures
  const [pinPickerType, setPinPickerType] = useState<"start" | "end" | "stop">(
    "start",
  );
  const [pinPickerStopIndex, setPinPickerStopIndex] = useState<number | null>(
    null,
  );
  // mapCenterRef always holds the latest geographic center of the map camera.
  // onRegionDidChange fires with the exact camera center — which is the same coordinate
  // as the visual center of the map view where the crosshair sits. Using a ref (not state)
  // means confirm reads the freshest value without async pixel conversion.
  const mapCenterRef = useRef<{ lng: number; lat: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [dropPinPreviewCoordinate, setDropPinPreviewCoordinate] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);
  // Tracks the Map view's pixel dimensions so we can compute its exact center
  // for getCoordinateFromView — the crosshair sits at [width/2, height/2].
  const mapViewSizeRef = useRef({ width: windowWidth, height: windowHeight });

  // User heading — Animated.Value so rotation updates without re-renders
  const headingAnim = useRef(new Animated.Value(0)).current;
  const isFirstHeadingRef = useRef(true);
  // Keep a plain ref for cardinal label (only needs to update occasionally)
  const headingRef = useRef(0);
  const mapBearingAnim = useRef(new Animated.Value(0)).current;
  const mapBearingRef = useRef(0);
  const arrowRotation = useMemo(() => {
    return Animated.subtract(headingAnim, mapBearingAnim);
  }, [headingAnim, mapBearingAnim]);
  const [headingCardinal, setHeadingCardinal] = useState("N");
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Navigation map orientation mode: "north-up" (standard) or "heading-up" (follows vehicle arrow pointer)
  const [navOrientationMode, setNavOrientationMode] = useState<"north-up" | "heading-up">("north-up");
  const navOrientationModeRef = useRef<"north-up" | "heading-up">("north-up");
  navOrientationModeRef.current = navOrientationMode;

  // ── Snap-to-Road (Map Matching) for Navigation ──────────────────────────────
  const activeRouteCoords = (
    isNavigating && activeNavRouteData
      ? activeNavRouteData?.features?.[0]?.geometry?.coordinates
      : activeRouteRef.current?.features?.[0]?.geometry?.coordinates
  ) as [number, number][] | undefined;
  const lastSnappedEdgeKey = useRef<string | undefined>(undefined);

  const snapResult = useMemo(() => {
    if (!location) return null;

    // Tier 1: When navigating, prioritize snapping directly to route polyline within 15 meters
    const navRouteCoords = (
      fullRouteRef.current?.features?.[0]?.geometry?.coordinates ?? activeRouteCoords
    ) as [number, number][] | undefined;

    if (
      isNavigating &&
      navRouteCoords &&
      navRouteCoords.length >= 2
    ) {
      const routeSnap = snapToRoute(location, navRouteCoords, 15);
      if (routeSnap) {
        lastSnappedEdgeKey.current = undefined;
        return routeSnap;
      }
    }

    // Tier 2: Snap to nearest road edge in the offline road graph within 25 meters (handles wrong-side walking, parallel carriageways, off-route)
    const roadSnap = LocalGraphRouter.snapToNearestRoad(
      location,
      headingRef.current,
      25,
      lastSnappedEdgeKey.current
    );
    if (roadSnap) {
      lastSnappedEdgeKey.current = roadSnap.edgeKey;
      return {
        coordinate: roadSnap.coordinate,
        bearing: roadSnap.bearing,
        distance: roadSnap.distance,
      };
    }

    lastSnappedEdgeKey.current = undefined;
    return null;
  }, [isNavigating, location, activeRouteCoords, routeVersion]);

  const snapResultRef = useRef(snapResult);
  snapResultRef.current = snapResult;

  // True if user is navigating starting from their actual current GPS location
  const isFromCurrentLocation = useMemo(() => {
    if (!startPoint) return true;
    if (startPoint.title === "Current Location" || startPoint.id === 999) return true;
    if (location && startPoint.coordinate) {
      const dist = calcDistance(startPoint.coordinate, location);
      if (dist <= 30) return true;
    }
    return false;
  }, [startPoint, location]);

  const displayLocation = snapResult ? snapResult.coordinate : location;

  // When navigation starts, initialize bearing to first road segment
  useEffect(() => {
    if (isNavigating && !snapResult && activeRouteCoords && activeRouteCoords.length >= 2) {
      const initialBearing = calculateBearing(
        { latitude: activeRouteCoords[0][1], longitude: activeRouteCoords[0][0] },
        { latitude: activeRouteCoords[1][1], longitude: activeRouteCoords[1][0] }
      );
      if (typeof initialBearing === "number" && !isNaN(initialBearing)) {
        headingRef.current = initialBearing;
        headingAnim.setValue(initialBearing);
        setHeadingCardinal(headingToCardinal(initialBearing));
      }
    }
  }, [isNavigating, snapResult, activeRouteCoords]);

  // Align navigation arrow to road direction (Google Maps style)
  useEffect(() => {
    if (isNavigating && snapResult) {
      const roadBearing = snapResult.bearing;
      if (typeof roadBearing === "number" && !isNaN(roadBearing)) {
        const prev = headingRef.current;
        let delta = roadBearing - prev;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const next = prev + delta;
        headingRef.current = next;

        Animated.timing(headingAnim, {
          toValue: next,
          useNativeDriver: true,
          duration: 350,
          easing: Easing.out(Easing.quad),
        }).start();

        const newCardinal = headingToCardinal(roadBearing);
        setHeadingCardinal((prevCardinal) =>
          prevCardinal !== newCardinal ? newCardinal : prevCardinal,
        );

        // When in heading-up mode, rotate the map camera to the arrow pointer direction!
        if (navOrientationMode === "heading-up") {
          const loc = snapResult.coordinate || location;
          cameraRef.current?.easeTo({
            bearing: roadBearing,
            ...(loc ? { center: [loc.longitude, loc.latitude] } : {}),
            duration: 350,
          });
        }
      }
    }
  }, [isNavigating, snapResult, navOrientationMode, location]);

  const [navigationData, setNavigationData] = useState({
    distanceRemaining: "0.0 mi",
    timeRemaining: "0 min",
    arrivalTime: "--:--",
    nextInstruction: {
      text: "Continue Straight",
      distance: "0 FT",
      icon: "straight" as never,
    },
  });
  const [showArrivalPopup, setShowArrivalPopup] = useState(false);
  const [showSameLocationPopup, setShowSameLocationPopup] = useState(false);
  const hasArrivedRef = useRef(false);

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return waypoints.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleSelectSearchResult = useCallback((wp: Waypoint) => {
    setSearchQuery("");
    setShowSearchResults(false);
    setSelectedWaypoint(wp);
    cameraRef.current?.easeTo({
      center: [wp.coordinate.longitude, wp.coordinate.latitude],
      zoom: 14,
      duration: 800,
    });
  }, []);

  // Sync navigation mode to layout context so tab bar hides/shows
  const {
    setIsNavigating: setLayoutNavigating,
    setIsBottomNavbarHidden,
    navbarVisibility,
  } = useNavigationMode();

  // Always show navbar and quicklinks on the map index page
  useFocusEffect(
    useCallback(() => {
      navbarVisibility.value = withTiming(0, { duration: 200 });
    }, [navbarVisibility]),
  );

  useFocusEffect(
    useCallback(() => {
      setLayoutNavigating(isNavigating || isCalculatingRoute);
      setIsBottomNavbarHidden(
        !!selectedWaypoint || isNavigating || isCalculatingRoute,
      );
      return () => {
        setLayoutNavigating(false);
        setIsBottomNavbarHidden(false);
      };
    }, [
      isNavigating,
      isCalculatingRoute,
      selectedWaypoint,
      setLayoutNavigating,
      setIsBottomNavbarHidden,
    ]),
  );

  // Handle Android hardware back button in navigation mode
  // (Moved BackHandler below handleExitNavigation)

  // ── Camera & misc refs ──────────────────────────────────────────────────────
  const cameraRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const isTappingMarker = useRef(false);
  const hasCenteredOnce = useRef(false);
  const isNavInFlightRef = useRef(false);
  const lastSliceIdx = useRef(-1);
  const currentRouteIndexRef = useRef(0);
  const consecutiveArrivalCount = useRef(0);
  const lastRecalculateTime = useRef(Date.now());
  const lastRecalculatePos = useRef<{ latitude: number; longitude: number } | null>(null);

  // ── Detail sheet animation ──────────────────────────────────────────────────
  const detailSheetTranslateY = useSharedValue(windowHeight);
  const detailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: detailSheetTranslateY.value }],
  }));
  const handleViewDetails = useCallback(() => {
    if (selectedWaypoint) {
      router.push({
        pathname: "/map/[id]",
        params: { id: selectedWaypoint.id },
      });
    }
  }, [selectedWaypoint]);
  const hideDetail = useCallback(() => {
    detailSheetTranslateY.value = withTiming(windowHeight, { duration: 300 });
  }, [detailSheetTranslateY, windowHeight]);

  // ── Default map center ──────────────────────────────────────────────────────
  const currentRegion = useMemo(() => {
    // Check for 'latitude' and 'longitude' (new format), fallback to 'lat' and 'long'/'lng'
    const latStr =
      mapSettingsData?.latitude ||
      mapSettingsData?.default_map_center?.latitude ||
      mapSettingsData?.default_map_center?.lat;
    const lngStr =
      mapSettingsData?.longitude ||
      mapSettingsData?.default_map_center?.longitude ||
      mapSettingsData?.default_map_center?.long ||
      mapSettingsData?.default_map_center?.lng;

    if (latStr && lngStr) {
      const lat = parseFloat(latStr as string);
      const lng = parseFloat(lngStr as string);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    // Fallback to Benezette, PA (center of ELK POIs) if no settings are available
    return { latitude: 41.3418, longitude: -78.3681 };
  }, [mapSettingsData]);

  // ── Hide initial [0, 0] Africa loading frame and camera snap ─────────────────
  useEffect(() => {
    if (apiStatus === "ready") {
      const timer = setTimeout(() => {
        setIsMapLoaded(true);
      }, 2500); // 2.5-second safety net
      return () => clearTimeout(timer);
    }
  }, [apiStatus]);

  // ── GPS tracking ────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    let posSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;
    let nativeLocationCallback: ((pos: any) => void) | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted || status !== "granted") return;
      // 1. Immediately get initial location fix (instant lock on load)
      try {
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (isMounted && lastLoc) {
          setLocation(lastLoc.coords);
        }
      } catch {
        // Ignore fallback
      }

      try {
        const currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (isMounted && currentLoc) {
          setLocation(currentLoc.coords);
        }
      } catch {
        // Ignore fallback
      }

      const pos = await Location.watchPositionAsync(
        {
          accuracy: isNavigating
            ? Location.Accuracy.BestForNavigation
            : Location.Accuracy.Balanced,
          distanceInterval: isNavigating ? 1 : 30,
          timeInterval: isNavigating ? 1000 : 10000,
        },
        (loc) => {
          if (!isMounted) return;
          setLocation(loc.coords);
          // If compass sensor is unavailable or stationary, fallback to GPS motion heading (reliable on Android)
          if (typeof loc.coords.heading === "number" && loc.coords.heading >= 0) {
            const gpsHeading = loc.coords.heading;
            if (!isNavigatingRef.current) {
              const prev = headingRef.current;
              let delta = gpsHeading - prev;
              if (delta > 180) delta -= 360;
              if (delta < -180) delta += 360;
              const next = prev + delta;
              headingRef.current = next;
              headingAnim.setValue(next);
            }
            const newCardinal = headingToCardinal(gpsHeading);
            setHeadingCardinal((prevCardinal) =>
              prevCardinal !== newCardinal ? newCardinal : prevCardinal,
            );
            if (
              isNavigatingRef.current &&
              navOrientationModeRef.current === "heading-up" &&
              !snapResultRef.current &&
              !startPointRef.current
            ) {
              cameraRef.current?.easeTo({
                bearing: gpsHeading,
                center: [loc.coords.longitude, loc.coords.latitude],
                duration: 350,
              });
            }
          }
        },
      );
      if (!isMounted) {
        pos.remove();
        return;
      }
      posSubscription = pos;

      // Connect native MapLibre location engine directly during navigation for high-performance zero-lag updates
      const locationManager = mapComponents?.LocationManager;
      if (
        isNavigating &&
        locationManager &&
        typeof locationManager.addListener === "function"
      ) {
        try {
          locationManager.setMinDisplacement(0);
          nativeLocationCallback = (locEvent: any) => {
            if (!isMounted || !locEvent?.coords) return;
            setLocation((prev: any) => {
              if (
                !prev ||
                prev.latitude !== locEvent.coords.latitude ||
                prev.longitude !== locEvent.coords.longitude
              ) {
                return locEvent.coords;
              }
              return prev;
            });
            const eventHeading =
              locEvent.coords.bearing ?? locEvent.coords.heading;
            if (typeof eventHeading === "number" && eventHeading >= 0) {
              const newCardinal = headingToCardinal(eventHeading);
              setHeadingCardinal((prevCardinal) =>
                prevCardinal !== newCardinal ? newCardinal : prevCardinal,
              );
              if (
                isNavigatingRef.current &&
                navOrientationModeRef.current === "heading-up" &&
                !snapResultRef.current &&
                !startPointRef.current
              ) {
                cameraRef.current?.easeTo({
                  bearing: eventHeading,
                  center: [locEvent.coords.longitude, locEvent.coords.latitude],
                  duration: 350,
                });
              }
            }
          };
          locationManager.addListener(nativeLocationCallback);
        } catch {
          // Fallback to Expo location watcher
        }
      }

      // Heading — fires on every compass change, animates smoothly via Animated.Value
      try {
        const heading = await Location.watchHeadingAsync((headingData) => {
          if (!isMounted) return;
          // In active navigation mode, arrow is locked to road direction (Google Maps style)
          if (isNavigatingRef.current) return;

          const deg =
            headingData.trueHeading >= 0
              ? headingData.trueHeading
              : headingData.magHeading;
          if (deg < 0) return;

          // On first heading load, immediately set value without spinning animation
          if (isFirstHeadingRef.current) {
            isFirstHeadingRef.current = false;
            headingRef.current = deg;
            headingAnim.setValue(deg);
            setHeadingCardinal(headingToCardinal(deg));
            return;
          }

          // Shortest-path rotation to avoid spinning the long way around
          const prev = headingRef.current;
          let delta = deg - prev;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          const next = prev + delta;
          headingRef.current = next;

          Animated.timing(headingAnim, {
            toValue: next,
            useNativeDriver: true,
            duration: 350,
            easing: Easing.out(Easing.quad),
          }).start();

          // Update cardinal label whenever cardinal direction transitions
          const newCardinal = headingToCardinal(deg);
          setHeadingCardinal((prevCardinal) =>
            prevCardinal !== newCardinal ? newCardinal : prevCardinal,
          );
        });
        if (!isMounted) {
          heading.remove();
          return;
        }
        headingSubscription = heading;
      } catch (headingErr) {
        console.warn("[Location] Compass heading not available on this device:", headingErr);
      }
    })();

    return () => {
      isMounted = false;
      posSubscription?.remove();
      headingSubscription?.remove();
      if (nativeLocationCallback && mapComponents?.LocationManager) {
        try {
          mapComponents.LocationManager.removeListener(nativeLocationCallback);
        } catch {
          // ignore
        }
      }
    };
  }, [isNavigating, mapComponents]);

  const handleRecenter = useCallback(() => {
    const cam = cameraRef.current;
    const loc =
      (isNavigating && !isFromCurrentLocation && startPoint?.coordinate)
        ? startPoint.coordinate
        : (displayLocation || location);
    if (!cam || !loc) return;
    const targetBearing =
      isNavigating && navOrientationModeRef.current === "heading-up"
        ? headingRef.current || 0
        : 0;

    cam.easeTo({
      center: [loc.longitude, loc.latitude],
      zoom: isNavigating ? 15 : 13,
      bearing: targetBearing,
      duration: 800,
    });
  }, [displayLocation, location, startPoint, isNavigating, isFromCurrentLocation]);

  const handleResetNorth = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore haptic failure
    }

    // Determine the relevant anchor point (starting point, route start, or active location)
    let targetCenter: [number, number] | undefined = undefined;

    if (isNavigating) {
      if (!isFromCurrentLocation && startPoint?.coordinate) {
        targetCenter = [startPoint.coordinate.longitude, startPoint.coordinate.latitude];
      } else if (displayLocation) {
        targetCenter = [displayLocation.longitude, displayLocation.latitude];
      }
    } else if (startPoint?.coordinate) {
      targetCenter = [startPoint.coordinate.longitude, startPoint.coordinate.latitude];
    } else if (selectedWaypoint?.coordinate) {
      targetCenter = [selectedWaypoint.coordinate.longitude, selectedWaypoint.coordinate.latitude];
    }

    if (isNavigating) {
      if (navOrientationModeRef.current === "north-up") {
        // Toggle to Heading-Up: map rotates to match the arrow pointer direction (Google Maps style)
        setNavOrientationMode("heading-up");
        const targetBearing = headingRef.current || 0;
        cameraRef.current?.easeTo({
          bearing: targetBearing,
          ...(targetCenter ? { center: targetCenter } : {}),
          duration: 500,
        });
      } else {
        // Toggle back to North-Up: operates normally like current mode
        setNavOrientationMode("north-up");
        cameraRef.current?.easeTo({
          bearing: 0,
          ...(targetCenter ? { center: targetCenter } : {}),
          duration: 500,
        });
      }
    } else {
      // Outside navigation, clicking compass always resets to True North, anchored to the starting point if selected
      cameraRef.current?.easeTo({
        bearing: 0,
        ...(targetCenter ? { center: targetCenter } : {}),
        duration: 500,
      });
    }
  }, [isNavigating, displayLocation, startPoint, selectedWaypoint, isFromCurrentLocation]);

  const fitRouteToCamera = useCallback(
    (coords: [number, number][], duration = 1000) => {
      if (!coords.length) return;

      // Filter out any invalid / Null Island coordinates
      let filtered = coords.filter(
        (c) =>
          Array.isArray(c) &&
          c.length === 2 &&
          !isNaN(c[0]) &&
          !isNaN(c[1]) &&
          !(Math.abs(c[0]) < 0.5 && Math.abs(c[1]) < 0.5),
      );
      if (!filtered.length) return;

      // If there are coordinates in North America / Elk Country, prioritize them over outliers
      const naCoords = filtered.filter(
        (c) => c[0] >= -170 && c[0] <= -52 && c[1] >= 14 && c[1] <= 72,
      );
      if (naCoords.length > 0) {
        filtered = naCoords;
      }

      if (filtered.length === 1) {
        cameraRef.current?.easeTo({ center: filtered[0], zoom: 14, duration });
        return;
      }

      let minLng = filtered[0][0],
        maxLng = filtered[0][0];
      let minLat = filtered[0][1],
        maxLat = filtered[0][1];
      for (let i = 1; i < filtered.length; i++) {
        minLng = Math.min(minLng, filtered[i][0]);
        maxLng = Math.max(maxLng, filtered[i][0]);
        minLat = Math.min(minLat, filtered[i][1]);
        maxLat = Math.max(maxLat, filtered[i][1]);
      }

      const lngSpan = Math.abs(maxLng - minLng);
      const latSpan = Math.abs(maxLat - minLat);
      if (lngSpan < 0.0004 && latSpan < 0.0004) {
        cameraRef.current?.easeTo({ center: filtered[0], zoom: 15, duration });
        return;
      }

      const isAndroid = Platform.OS === "android";
      const topPadding = isAndroid ? 50 : insets.top + 160;
      const bottomPadding = isAndroid
        ? selectedWaypoint
          ? 160
          : 60
        : selectedWaypoint
          ? insets.bottom + 300
          : insets.bottom + 120;
      const horizPadding = isAndroid ? 30 : 48;

      cameraRef.current?.fitBounds([minLng, minLat, maxLng, maxLat], {
        duration,
        easing: "ease",
        padding: {
          top: topPadding,
          right: horizPadding,
          bottom: bottomPadding,
          left: horizPadding,
        },
      });
    },
    [insets.bottom, insets.top, selectedWaypoint],
  );

  // ── Scenic Drive: handle navigateToWaypointId param from explore screen ─────
  const params = useLocalSearchParams();
  const hasHandledNavParam = useRef<string | false>(false);

  // Fit map camera to all waypoints once on initial load
  useEffect(() => {
    if (
      isMapLoaded &&
      waypoints.length > 0 &&
      cameraRef.current &&
      !hasCenteredOnce.current
    ) {
      if (params.navigateToWaypointId || params.routeToWaypointId) {
        hasCenteredOnce.current = true;
        // Mark map ready after a tiny delay if we are navigating/routing to a specific pin
        setTimeout(() => {
          setIsMapReady(true);
        }, 300);
        return;
      }

      const validCoords = getValidPoiCoords(waypoints);
      if (validCoords.length > 0) {
        hasCenteredOnce.current = true;
        // Delay slightly so the native thread completes layout snap
        setTimeout(() => {
          fitRouteToCamera(validCoords, 500);
          setIsMapReady(true);
        }, 200);
      }
    }
  }, [isMapLoaded, waypoints, fitRouteToCamera, params]);

  // Re-center on waypoints when offline map download completes
  const prevHasMap = useRef(hasMap);
  const prevIsDownloading = useRef(isDownloading);

  useEffect(() => {
    const justFinishedDownload = prevIsDownloading.current && !isDownloading;
    const justGotMap = !prevHasMap.current && hasMap;

    prevIsDownloading.current = isDownloading;
    prevHasMap.current = hasMap;

    if (
      (justFinishedDownload || justGotMap) &&
      waypoints.length > 0 &&
      !isNavigating &&
      !params.navigateToWaypointId &&
      !params.routeToWaypointId
    ) {
      hasCenteredOnce.current = false;
      const validCoords = getValidPoiCoords(waypoints);
      if (validCoords.length > 0) {
        const timer = setTimeout(() => {
          fitRouteToCamera(validCoords, 500);
          setIsMapReady(true);
        }, 300);

        return () => clearTimeout(timer);
      }
    }
  }, [hasMap, isDownloading, waypoints, fitRouteToCamera, isNavigating, params]);

  useFocusEffect(
    useCallback(() => {
      const waypointId = params.navigateToWaypointId;
      if (!waypointId) return;

      const id = parseInt(String(waypointId), 10);
      const destination = waypoints.find((w) => w.id === id);
      if (!destination) return;
      const navRequestKey = `${id}:${params.navRequestId ?? "initial"}`;

      if (hasHandledNavParam.current === navRequestKey || isNavigating) return;
      hasHandledNavParam.current = navRequestKey;

      (async () => {
        try {
          // Load the scenic drive route from route.json
          const routeData = await import("../../route.json");
          const encodedGeometry = routeData.routes?.[0]?.geometry;
          if (!encodedGeometry || typeof encodedGeometry !== "string") {
            console.warn("[ScenicDrive] No route geometry found");
            return;
          }

          // Decode the polyline string to coordinates
          const decodedCoords = decodePolyline(encodedGeometry);
          const coords: [number, number][] = decodedCoords.map((c) => [
            c.longitude,
            c.latitude,
          ]);

          const routeFeature = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {
                  id: "scenic-drive",
                  startWaypoint: null,
                  endWaypoint: destination,
                },
                geometry: {
                  type: "LineString",
                  coordinates: coords,
                },
              },
            ],
          };

          lastSliceIdx.current = -1;
          lastRecalculateTime.current = Date.now();
          fullRouteRef.current = routeFeature;
          activeRouteRef.current = routeFeature;
          setActiveNavRouteData(routeFeature);

          // Calculate total distance from route coordinates
          let totalRouteDistance = 0;
          for (let i = 0; i < coords.length - 1; i++) {
            totalRouteDistance += calcDistance(
              { latitude: coords[i][1], longitude: coords[i][0] },
              { latitude: coords[i + 1][1], longitude: coords[i + 1][0] },
            );
          }
          const totalDistMi = totalRouteDistance / 1609.34;
          const totalDurMin = Math.round((totalRouteDistance / 1609.34) * 2.5);
          const arrivalETA = new Date(Date.now() + totalDurMin * 60000);
          const arrivalStr = arrivalETA.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          });

          unstable_batchedUpdates(() => {
            setRouteVersion((v) => v + 1);
            setDestinationPoint(destination);
            setStartPoint({
              id: 999,
              title: "Scenic Drive Start",
              coordinate: { latitude: coords[0][1], longitude: coords[0][0] },
              description: "Starting point of the Elk Scenic Drive",
            });
            setNavigationData({
              distanceRemaining: `${totalDistMi.toFixed(1)} mi`,
              timeRemaining: `${totalDurMin} min`,
              arrivalTime: arrivalStr,
              nextInstruction: {
                text: "Continue Straight",
                distance: `${totalDistMi.toFixed(1)} mi`,
                icon: "straight" as never,
              },
            });
            setIsNavigating(true);
            setShowPointPicker(false);
          });

          requestAnimationFrame(() => {
            fitRouteToCamera(coords, 1200);
          });
        } catch (error) {
          console.error("[ScenicDrive] Error loading route:", error);
        }
      })();
    }, [
      params.navigateToWaypointId,
      params.navRequestId,
      isNavigating,
      fitRouteToCamera,
    ]),
  );

  // ── Waypoint interaction ────────────────────────────────────────────────────
  const handleWaypointPress = useCallback(
    (waypoint: Waypoint) => {
      if (isNavigating) return;
      isTappingMarker.current = true;
      setTimeout(() => {
        isTappingMarker.current = false;
      }, 300);
      setSelectedWaypoint(waypoint);
      setDestinationPoint(waypoint);
      if (!isNavigating) {
        activeRouteRef.current = null;
        setRouteVersion((v) => v + 1);
      }
      const index = waypoints.findIndex((w) => w.id === waypoint.id);
      if (index !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: false });
        }, 50);
      }

      // Smoothly zoom in to the selected waypoint pin (works on both Android and iOS)
      requestAnimationFrame(() => {
        cameraRef.current?.easeTo({
          center: [
            waypoint.coordinate.longitude,
            waypoint.coordinate.latitude,
          ],
          zoom: 14,
          duration: 800,
        });
      });
    },
    [isNavigating, waypoints],
  );

  const handleCloseCard = useCallback(() => {
    setSelectedWaypoint(null);
    setDestinationPoint(null);
    if (waypoints.length > 0) {
      const validCoords = getValidPoiCoords(waypoints);
      if (validCoords.length > 0) {
        setTimeout(() => {
          fitRouteToCamera(validCoords, 800);
        }, 100);
      }
    }
  }, [waypoints, fitRouteToCamera]);

  const handleRoutePress = useCallback(
    (route: "main" | "orange", coords: [number, number]) => {
      isTappingMarker.current = true;
      setTimeout(() => {
        isTappingMarker.current = false;
      }, 300);
      setHighlightedRoute(route);
    },
    [],
  );

  const handleScrollEnd = useCallback(
    (event: any) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
      const waypoint = waypoints[index];
      if (waypoint) {
        setSelectedWaypoint(waypoint);
        setDestinationPoint(waypoint);
        if (!isNavigating) {
          activeRouteRef.current = null;
          setRouteVersion((v) => v + 1);
        }
        requestAnimationFrame(() => {
          cameraRef.current?.easeTo({
            center: [
              waypoint.coordinate.longitude,
              waypoint.coordinate.latitude,
            ],
            zoom: 14,
            duration: 800,
          });
        });
      }
    },
    [isNavigating, windowWidth, waypoints],
  );

  // ── Open route planner ──────────────────────────────────────────────────────
  // Pass an optional destination to pre-fill from the waypoint carousel card
  const handleNavigate = useCallback(
    async (destination?: Waypoint) => {
      setStopPoints([]);
      const targetDest = destination ?? selectedWaypoint;
      if (targetDest) {
        setDestinationPoint(targetDest);
      } else {
        setDestinationPoint(null);
      }

      if (location) {
        // Auto-select nearest POI if user is near one (within 100 meters)
        let nearbyPoi: Waypoint | null = null;
        let minDistance = Infinity;

        for (const wp of waypoints) {
          if (targetDest && wp.id === targetDest.id) continue;
          if (
            wp.coordinate &&
            typeof wp.coordinate.latitude === "number" &&
            typeof wp.coordinate.longitude === "number"
          ) {
            const dist = calcDistance(location, wp.coordinate);
            if (dist <= 100 && dist < minDistance) {
              minDistance = dist;
              nearbyPoi = wp;
            }
          }
        }

        if (nearbyPoi) {
          setStartPoint(nearbyPoi);
        } else {
          setStartPoint({
            id: 999,
            title: "Current Location",
            coordinate: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            description: "Your current GPS position",
          });
        }
        setPickerType("end");
      } else {
        setStartPoint(null);
        setPickerType("start");
      }
      setShowPointPicker(true);
    },
    [location, selectedWaypoint, waypoints],
  );

  // ── Start navigation ────────────────────────────────────────────────────────
  const startActualNavigation = useCallback(
    async (
      from: Waypoint,
      to: Waypoint,
      stops: Waypoint[] = [],
      isRecalculating = false,
    ) => {
      if (isNavInFlightRef.current) return;
      isNavInFlightRef.current = true;
      try {
        if (!from?.coordinate || !to?.coordinate) {
          setTimeout(
            () =>
              Alert.alert(
                "Route Not Available",
                "Missing location data for routing.",
              ),
            300,
          );
          setIsCalculatingRoute(false);
          isNavInFlightRef.current = false;
          return;
        }

        // Prevent calculating routes between the same locations (exclude drop locations / pins)
        const allPoints = [from, ...stops, to];
        let hasDuplicateLocation = false;

        const isDropLocation = (p: Waypoint) =>
          p.id === 888 ||
          (typeof p.id === "number" && p.id < 0) ||
          p.title?.trim().toLowerCase() === "dropped pin" ||
          p.description === "Custom point selected on map";

        for (let i = 0; i < allPoints.length - 1; i++) {
          for (let j = i + 1; j < allPoints.length; j++) {
            const p1 = allPoints[i];
            const p2 = allPoints[j];

            // Exclude drop locations from same location check
            if (isDropLocation(p1) || isDropLocation(p2)) {
              continue;
            }

            const isSame =
              (p1.id !== undefined && p2.id !== undefined && p1.id === p2.id) ||
              (Boolean(p1.title) &&
                Boolean(p2.title) &&
                p1.title.trim().toLowerCase() === p2.title.trim().toLowerCase()) ||
              (p1.coordinate &&
                p2.coordinate &&
                calcDistance(p1.coordinate, p2.coordinate) < 25);

            if (isSame) {
              hasDuplicateLocation = true;
              break;
            }
          }
          if (hasDuplicateLocation) break;
        }

        if (hasDuplicateLocation) {
          setShowSameLocationPopup(true);
          setIsCalculatingRoute(false);
          isNavInFlightRef.current = false;
          return;
        }

        if (!isRecalculating) {
          setIsCalculatingRoute(true);
          lastRecalculatePos.current = null;
        }

        // Build ordered list of waypoint IDs
        const allIds = [from.id, ...stops.map((s) => s.id), to.id];

        // Block routes that span unrealistic distances (e.g., across oceans)
        const straightLineDist = calcDistance(from.coordinate, to.coordinate);
        if (straightLineDist > 5000000) {
          // 5000 km (~3100 miles)
          setTimeout(() => {
            Alert.alert(
              "Location Too Far",
              "This place is too far away. Please choose a closer location.",
            );
          }, 300);
          setIsCalculatingRoute(false);
          isNavInFlightRef.current = false;
          return;
        }

        // Heading is only meaningful when routing from live GPS ("Current Location"), never for static POIs
        const isFromCurrentLoc =
          from.title === "Current Location" || from.id === 999 || from.id === -1;
        const navHeading =
          isFromCurrentLoc && (headingRef.current || 0) > 0
            ? headingRef.current
            : undefined;

        // Get route from SQLite cache (falls back to OSRM if not cached)
        const result = await getRouteBetween(
          from.id,
          to.id,
          stops.map((s) => s.id),
          from.coordinate,
          to.coordinate,
          stops.map((s) => s.coordinate),
          navHeading,
        );

        if (!result.coordinates || result.coordinates.length < 2) {
          setTimeout(() => {
            Alert.alert(
              "Route Not Available",
              "No route found. Please check your connection or try another destination.",
            );
          }, 300);
          setIsCalculatingRoute(false);
          isNavInFlightRef.current = false;
          return;
        }

        const coords = result.coordinates;
        const roundabouts =
          result.roundabouts ||
          LocalGraphRouter.detectRoundaboutsInPolyline(coords);

        const routeData = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                id: "active-route",
                startWaypoint: from,
                endWaypoint: to,
                roundabouts,
              },
              geometry: {
                type: "LineString",
                coordinates: coords,
              },
            },
          ],
        };

        lastSliceIdx.current = -1;
        currentRouteIndexRef.current = 0;
        consecutiveArrivalCount.current = 0;
        lastRecalculateTime.current = Date.now();
        fullRouteRef.current = routeData;
        activeRouteRef.current = routeData;
        setActiveNavRouteData(routeData);

        // Initialize stats from route result
        const totalDistMi = result.distance / 1609.34;
        const totalDurMin = Math.round(result.duration / 60);
        const arrivalETA = new Date(Date.now() + result.duration * 1000);
        const arrivalStr = arrivalETA.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });

        console.log(
          `[Navigation] Route result: distance=${result.distance}m (${totalDistMi.toFixed(1)} mi), duration=${result.duration}s (${totalDurMin} min)`,
        );

        // Set navigation state first, then UI state
        setNavigationData({
          distanceRemaining: `${totalDistMi.toFixed(1)} mi`,
          timeRemaining: `${totalDurMin} min`,
          arrivalTime: arrivalStr,
          nextInstruction: {
            text: "Continue Straight",
            distance: `${totalDistMi.toFixed(1)} mi`,
            icon: "straight" as never,
          },
        });

        setRouteVersion((v) => v + 1);
        setDestinationPoint(to);
        setStartPoint(from);
        setIsNavigating(true);
        setShowPointPicker(false);

        if (!isRecalculating) {
          requestAnimationFrame(() => {
            fitRouteToCamera(coords, 1000);
          });
        }
      } catch (error: any) {
        if (error?.message === "offline_outside_elk_country") {
          setTimeout(() => {
            Alert.alert(
              "Internet Connection Required",
              "You have selected a location outside the Elk Country region. An internet connection is required to calculate driving directions outside this area.",
            );
          }, 300);
        } else if (error?.message === "offline_no_cache") {
          setTimeout(() => {
            Alert.alert(
              "Internet Required",
              "Route cannot be calculated. This requires an internet connection.",
            );
          }, 300);
        }
      } finally {
        setIsCalculatingRoute(false);
        setTimeout(() => {
          isNavInFlightRef.current = false;
        }, 1000);
      }
    },
    [fitRouteToCamera, getRouteBetween],
  );

  // ── Dynamic Route: handle routeToWaypointId param ───────────────────────────
  useFocusEffect(
    useCallback(() => {
      const routeToWaypointId = params.routeToWaypointId;
      if (!routeToWaypointId) return;

      const id = parseInt(String(routeToWaypointId), 10);
      const destination = waypoints.find((w) => w.id === id);
      if (!destination) return;
      const navRequestKey = `route:${id}:${params.navRequestId ?? "initial"}`;

      if (hasHandledNavParam.current === navRequestKey || isNavigating) return;

      if (!location) {
        setIsCalculatingRoute(true);
        const timeoutId = setTimeout(() => {
          setIsCalculatingRoute(false);
          hasHandledNavParam.current = navRequestKey;
          alert("Could not determine your location to calculate the route.");
        }, 15000);

        (async () => {
          try {
            let loc = await Location.getLastKnownPositionAsync();
            if (!loc) {
              loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
            }
            if (loc) {
              clearTimeout(timeoutId);
              hasHandledNavParam.current = navRequestKey;
              setLocation(loc.coords);
              const fromWaypoint: Waypoint = {
                id: -1,
                title: "Current Location",
                description: "Your current location",
                coordinate: loc.coords,
              };
              startActualNavigation(fromWaypoint, destination, [], false);
            }
          } catch (e) {
            console.warn("Failed to actively fetch location for routing:", e);
          }
        })();

        return () => clearTimeout(timeoutId);
      }

      hasHandledNavParam.current = navRequestKey;

      const fromWaypoint: Waypoint = {
        id: -1,
        title: "Current Location",
        description: "Your current location",
        coordinate: location,
      };

      startActualNavigation(fromWaypoint, destination, [], false);
    }, [
      params.routeToWaypointId,
      params.navRequestId,
      location,
      isNavigating,
      startActualNavigation,
      waypoints,
    ]),
  );

  // ── Live navigation stats update ────────────────────────────────────────────
  const stopPointsRef = useRef<Waypoint[]>([]);
  useEffect(() => {
    stopPointsRef.current = stopPoints;
  }, [stopPoints]);

  useEffect(() => {
    if (
      !isNavigating ||
      !location ||
      !fullRouteRef.current ||
      isCalculatingRoute
    )
      return;
    try {
      const feature = fullRouteRef.current.features?.[0];
      if (!feature) return;
      const coords: [number, number][] = feature.geometry?.coordinates;
      if (!coords || coords.length === 0) return;
      const toWP = feature.properties?.endWaypoint;
      if (!toWP) return;

      const now = Date.now();
      const curIdx = currentRouteIndexRef.current;
      // Dynamic bounded forward window:
      // Allows slight backward GPS jitter (-2 points) and forward search up to 25 points (~250-300m)
      // Prevents progress from leaping across U-turns, roundabouts, or to future sections of the route
      const minSearchIdx = Math.max(0, curIdx - 2);
      const maxSearchIdx = Math.min(coords.length - 2, curIdx + 25);

      const latRad = (location.latitude * Math.PI) / 180;
      const cosLat = Math.cos(latRad);

      let bestDist = Infinity;
      let bestSegIdx = curIdx;
      let bestProj: [number, number] = coords[Math.min(curIdx, coords.length - 1)];

      for (let i = minSearchIdx; i <= maxSearchIdx; i++) {
        const a = coords[i];
        const b = coords[i + 1];
        const dx = (b[0] - a[0]) * cosLat;
        const dy = b[1] - a[1];
        const lenSq = dx * dx + dy * dy;
        let t = 0;
        if (lenSq > 0) {
          t = ((location.longitude - a[0]) * cosLat * dx + (location.latitude - a[1]) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
        }
        const projLng = a[0] + t * (b[0] - a[0]);
        const projLat = a[1] + t * (b[1] - a[1]);
        const d = calcDistance(location, { latitude: projLat, longitude: projLng });
        if (d < bestDist) {
          bestDist = d;
          bestSegIdx = i;
          bestProj = [projLng, projLat];
        }
      }

      // Only advance progress forward when locked onto the path within 45 meters
      if (bestDist <= 45) {
        currentRouteIndexRef.current = Math.max(curIdx, bestSegIdx);
      }
      const effectiveIdx = currentRouteIndexRef.current;

      if (effectiveIdx >= 0 && coords[effectiveIdx]) {
        const distanceToPath = bestDist;

        // Recalculate route if off-path (both offline router and online OSRM will handle it)
        const OFF_PATH_THRESHOLD = 50; // meters
        const cooldownElapsed = now - lastRecalculateTime.current > 5000;
        const isCurrentLocationStart =
          feature.properties?.startWaypoint?.id === 999 ||
          feature.properties?.startWaypoint?.id === -1;

        if (distanceToPath > OFF_PATH_THRESHOLD) {
          const hasMovedSignificantly =
            !lastRecalculatePos.current ||
            calcDistance(location, lastRecalculatePos.current) > 30;

          // Trigger off-path recalculation if starting from Current Location OR within 5km of the route (e.g. taking a detour/alternate road)
          if (
            (isCurrentLocationStart || distanceToPath < 5000) &&
            cooldownElapsed &&
            hasMovedSignificantly
          ) {
            lastRecalculateTime.current = now;
            lastRecalculatePos.current = location;
            startActualNavigation(
              {
                id: 999,
                title: "Current Location",
                coordinate: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                },
                description: "",
              },
              toWP,
              stopPointsRef.current,
              true, // isRecalculating
            );
            return;
          } else if (!isCurrentLocationStart && distanceToPath >= 5000) {
            // User is previewing a route from far away.
            // Do NOT snap progress to the end of the route (which would show 0.0 mi).
            return;
          }
        }

        // Remaining distance — sum from vehicle projected location to next vertex and to end
        let totalDist = 0;
        if (effectiveIdx < coords.length - 1) {
          totalDist += calcDistance(
            { latitude: bestProj[1], longitude: bestProj[0] },
            { latitude: coords[effectiveIdx + 1][1], longitude: coords[effectiveIdx + 1][0] },
          );
          for (let i = effectiveIdx + 1; i < coords.length - 1; i++) {
            totalDist += calcDistance(
              { latitude: coords[i][1], longitude: coords[i][0] },
              { latitude: coords[i + 1][1], longitude: coords[i + 1][0] },
            );
          }
        }
        const distMi = totalDist / 1609.34;
        const timeMin = Math.max(1, Math.round(distMi * 2.5));
        const arrival = new Date(Date.now() + timeMin * 60000);
        const arrivalStr = arrival.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });

        // ── Active route polyline: begins EXACTLY at the vehicle position ───────
        // Eliminates both the gap ahead of the arrow and the lingering tail behind it!
        const activeCoords: [number, number][] = [
          bestProj,
          ...coords.slice(effectiveIdx + 1),
        ];

        // Next turn instruction — find the next genuine intersection maneuver ahead
        const roundabouts: RoundaboutManeuver[] = feature.properties?.roundabouts || [];

        let instruction = {
          text: "Continue Straight",
          distance: "",
          icon: "straight" as never,
        };

        if (totalDist <= 40) {
          instruction = {
            text: `Arriving at ${toWP.title || "Destination"}`,
            distance: totalDist > 10 ? `In ${Math.round(totalDist * 3.28084)} ft` : "Arrived",
            icon: "location-on" as never,
          };
        } else {
          // Check for active or upcoming roundabout
          // 1. Is the vehicle currently inside a roundabout?
          const currentRb = roundabouts.find(
            (rb) => effectiveIdx >= rb.entryIndex && effectiveIdx < rb.exitIndex
          );

          // 2. Is there an upcoming roundabout ahead?
          const upcomingRb = !currentRb
            ? roundabouts.find((rb) => effectiveIdx < rb.entryIndex)
            : undefined;

          // Distance along the route to upcoming roundabout entrance
          let distToUpcomingRb = Infinity;
          if (upcomingRb) {
            distToUpcomingRb = calcDistance(
              { latitude: bestProj[1], longitude: bestProj[0] },
              {
                latitude: coords[Math.min(effectiveIdx + 1, coords.length - 1)][1],
                longitude: coords[Math.min(effectiveIdx + 1, coords.length - 1)][0],
              }
            );
            for (let i = effectiveIdx + 1; i < upcomingRb.entryIndex; i++) {
              distToUpcomingRb += calcDistance(
                { latitude: coords[i][1], longitude: coords[i][0] },
                { latitude: coords[i + 1][1], longitude: coords[i + 1][0] }
              );
            }
          }

          if (currentRb) {
            // Vehicle is currently circulating inside the roundabout!
            // Compute distance from vehicle position to exit
            let distToExit = calcDistance(
              { latitude: bestProj[1], longitude: bestProj[0] },
              {
                latitude: coords[Math.min(effectiveIdx + 1, coords.length - 1)][1],
                longitude: coords[Math.min(effectiveIdx + 1, coords.length - 1)][0],
              }
            );
            for (let i = effectiveIdx + 1; i < currentRb.exitIndex; i++) {
              distToExit += calcDistance(
                { latitude: coords[i][1], longitude: coords[i][0] },
                { latitude: coords[i + 1][1], longitude: coords[i + 1][0] }
              );
            }

            const ordinal = getOrdinal(currentRb.exitNumber);
            const distStr =
              distToExit > 400
                ? `${(distToExit / 1609.34).toFixed(1)} mi`
                : `${Math.round(distToExit * 3.28084)} ft`;

            instruction = {
              text: `Take the ${ordinal} exit`,
              distance: `In ${distStr}`,
              icon: "roundabout-left" as never,
            };
          } else if (upcomingRb && distToUpcomingRb <= 600) {
            // Approaching roundabout within 600m (~2000 ft)
            const ordinal = getOrdinal(upcomingRb.exitNumber);
            const distStr =
              distToUpcomingRb > 400
                ? `${(distToUpcomingRb / 1609.34).toFixed(1)} mi`
                : `${Math.round(distToUpcomingRb * 3.28084)} ft`;

            instruction = {
              text: `At the roundabout, take the ${ordinal} exit`,
              distance: `In ${distStr}`,
              icon: "roundabout-left" as never,
            };
          } else if (activeCoords.length > 2) {
            let distAcc = 0;
            let prevBearing = calculateBearing(
              { latitude: activeCoords[0][1], longitude: activeCoords[0][0] },
              { latitude: activeCoords[1][1], longitude: activeCoords[1][0] },
            );

            for (let i = 1; i < activeCoords.length - 1; i++) {
              const segDist = calcDistance(
                { latitude: activeCoords[i - 1][1], longitude: activeCoords[i - 1][0] },
                { latitude: activeCoords[i][1], longitude: activeCoords[i][0] },
              );
              distAcc += segDist;
              if (distAcc > 3000) break;

              // Do NOT evaluate internal vertices of a roundabout as regular turns
              const coordGlobalIdx = effectiveIdx + i;
              const insideAnyRb = roundabouts.some(
                (rb) => coordGlobalIdx >= rb.entryIndex && coordGlobalIdx <= rb.exitIndex
              );
              if (insideAnyRb) {
                continue;
              }

              const segBearing = calculateBearing(
                { latitude: activeCoords[i][1], longitude: activeCoords[i][0] },
                { latitude: activeCoords[i + 1][1], longitude: activeCoords[i + 1][0] },
              );

              // Compute turn deflection angle AT this intersection node (between incoming and outgoing segments)
              let diff = segBearing - prevBearing;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;

              // Only report genuine intersection turns (deflection >= 35 degrees)
              if (Math.abs(diff) >= 35) {
                const turn = getTurnInstruction(prevBearing, segBearing);
                if (turn.text !== "Continue Straight") {
                  const distStr =
                    distAcc > 400
                      ? `${(distAcc / 1609.34).toFixed(1)} mi`
                      : `${Math.round(distAcc * 3.28084)} ft`;
                  instruction = { ...turn, distance: `In ${distStr}` } as any;
                  break;
                }
              }

              prevBearing = segBearing;
            }

            // If no turn found, show distance to next significant point
            if (!instruction.distance) {
              instruction.distance =
                distMi > 0.1 ? `${distMi.toFixed(1)} mi` : "Arriving";
            }
          }
        }

        const slicedFeatureCollection = {
          ...fullRouteRef.current,
          features: [
            {
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: activeCoords,
              },
            },
          ],
        };
        activeRouteRef.current = slicedFeatureCollection;
        setActiveNavRouteData(slicedFeatureCollection);

        // ── Destination arrival detection ──────────────────────────────
        // Requires ALL conditions:
        // 1. Straight-line physical GPS proximity to destination pin <= 20m
        // 2. Remaining driving route distance along geometry <= 20m
        // 3. Monotonic progress has traversed near the final segment of the route (preventing false arrival on loops)
        // 4. Confirmed over at least 2 consecutive updates to prevent single GPS glitch triggers
        const distToDestinationMeters = calcDistance(location, {
          latitude: toWP.coordinate.latitude,
          longitude: toWP.coordinate.longitude,
        });
        const isProximityReached =
          distToDestinationMeters <= DESTINATION_PROXIMITY_THRESHOLD_METERS;
        const isRouteCompleted =
          totalDist <= REMAINING_ROUTE_THRESHOLD_METERS;
        const isNearFinalSegment =
          effectiveIdx >= Math.max(0, coords.length - 4);

        if (
          isProximityReached &&
          isRouteCompleted &&
          isNearFinalSegment
        ) {
          consecutiveArrivalCount.current += 1;
          if (consecutiveArrivalCount.current >= 2 && !hasArrivedRef.current) {
            hasArrivedRef.current = true;
            setShowArrivalPopup(true);
          }
        } else {
          consecutiveArrivalCount.current = 0;
        }

        setNavigationData((prev) => {
          const next = {
            distanceRemaining: `${distMi.toFixed(1)} mi`,
            timeRemaining: `${timeMin} min`,
            arrivalTime: arrivalStr,
            nextInstruction: instruction,
          };
          if (
            prev.distanceRemaining === next.distanceRemaining &&
            prev.timeRemaining === next.timeRemaining &&
            prev.arrivalTime === next.arrivalTime &&
            prev.nextInstruction.text === next.nextInstruction.text &&
            prev.nextInstruction.distance === next.nextInstruction.distance
          )
            return prev;
          return next;
        });
      }
    } catch (err: unknown) {
      console.error("CRASH PREVENTED in NavUpdate:", err);
    }
  }, [location, isNavigating, isCalculatingRoute, startActualNavigation]);

  // ── Exit navigation ─────────────────────────────────────────────────────────
  const handleExitNavigation = useCallback(() => {
    const shouldGoBack =
      hasHandledNavParam.current !== false && router.canGoBack();

    activeRouteRef.current = null;
    setActiveNavRouteData(null);
    fullRouteRef.current = null;
    lastSliceIdx.current = -1;
    currentRouteIndexRef.current = 0;
    consecutiveArrivalCount.current = 0;
    headingRef.current = 0;

    router.setParams({
      routeToWaypointId: undefined,
      navigateToWaypointId: undefined,
      navRequestId: undefined,
    } as any);

    hasHandledNavParam.current = false;
    hasArrivedRef.current = false;
    isNavInFlightRef.current = false;
    lastRecalculatePos.current = null;
    setShowArrivalPopup(false);
    isNavigatingRef.current = false;
    setNavOrientationMode("north-up");
    cameraRef.current?.easeTo({
      bearing: 0,
      duration: 500,
    });
    unstable_batchedUpdates(() => {
      setIsNavigating(false);
      setStartPoint(null);
      setDestinationPoint(null);
      setStopPoints([]);
      setRouteVersion((v) => v + 1);
      setNavigationData({
        distanceRemaining: "0.0 mi",
        timeRemaining: "0 min",
        arrivalTime: "--:--",
        nextInstruction: {
          text: "Continue Straight",
          distance: "0 FT",
          icon: "straight" as any,
        } as any,
      });
    });

    if (shouldGoBack) {
      router.back();
    }
  }, []);

  // Handle Android hardware back button in navigation mode
  useEffect(() => {
    if (!isNavigating) return;
    const onBackPress = () => {
      handleExitNavigation();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => {
      subscription.remove();
    };
  }, [isNavigating, handleExitNavigation]);

  // ── Memoized waypoint marker ────────────────────────────────────────────────
  const WaypointMarker = useMemo(() => {
    const WaypointMarkerComponent = ({
      waypoint,
      isSelected,
      onPress,
      disabled,
      Marker: MarkerComp,
    }: {
      waypoint: Waypoint;
      isSelected: boolean;
      onPress: (w: Waypoint) => void;
      disabled?: boolean;
      Marker: any;
    }) => {
      const lastPressRef = useRef(0);
      const handlePress = useCallback(() => {
        if (disabled) return;
        const now = Date.now();
        if (now - lastPressRef.current < 250) return;
        lastPressRef.current = now;
        onPress(waypoint);
      }, [disabled, onPress, waypoint]);

      return (
        <MarkerComp
          key={`waypoint-${waypoint.id}`}
          id={`waypoint-${waypoint.id}`}
          lngLat={toLngLat(waypoint.coordinate)}
          anchor="bottom"
          onPress={handlePress}
        >
          <TouchableOpacity
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={disabled ? 1 : 0.7}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{
              minWidth: 48,
              minHeight: 52,
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            {waypoint.pin_icon_override ? (
              <Image
                source={{
                  uri:
                    typeof waypoint.pin_icon_override === "string"
                      ? waypoint.pin_icon_override
                      : (waypoint.pin_icon_override as any).url,
                }}
                style={{
                  width: isSelected ? 36 : 28,
                  height: isSelected ? 36 : 28,
                  marginBottom: 2,
                }}
                contentFit="contain"
              />
            ) : (
              <Image
                source={require("../../assets/images/pin.png")}
                style={{
                  width: isSelected ? 44 : 36,
                  height: isSelected ? 44 : 36,
                }}
                contentFit="contain"
              />
            )}
          </TouchableOpacity>
        </MarkerComp>
      );
    };
    const Memoized = React.memo(WaypointMarkerComponent);
    Memoized.displayName = "WaypointMarker";
    return Memoized;
  }, []);

  // ── Waypoint card renderer ──────────────────────────────────────────────────
  const renderWaypointCard = useCallback(
    ({ item }: { item: Waypoint }) => (
      <View
        style={{
          width: windowWidth,
          paddingHorizontal: 0,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          style={[
            styles.hotspotCard,
            {
              paddingBottom: insets.bottom + 12,
              minHeight: 180 + insets.bottom,
              justifyContent: "space-between",
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <View style={styles.titleContainer}>
                <MaterialIcons
                  name="place"
                  size={20}
                  color={isDark ? colors.onSurface : "black"}
                  style={{ marginRight: 6 }}
                />
                {isValidData(item.title) ? (
                  <AppText style={styles.hotspotTitle} numberOfLines={1}>
                    {item.title}
                  </AppText>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={handleCloseCard}
                style={styles.cardCloseButton}
              >
                <MaterialIcons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>

            {isValidData(item.description) ? (
              <AppText style={styles.hotspotDescription} numberOfLines={3}>
                {item.description}
              </AppText>
            ) : null}
          </View>

          <View style={styles.cardFooterRow}>
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={handleViewDetails}
            >
              <AppText style={styles.viewMoreButtonText}>View More</AppText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    ),
    [
      windowWidth,
      handleViewDetails,
      colors.onSurface,
      isDark,
      setSelectedWaypoint,
      insets.bottom,
    ],
  );

  // ── Loading / error guards ──────────────────────────────────────────────────
  if (Platform.OS !== "web" && !mapComponents && !isExpoGo) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, backgroundColor: colors.surface }} />
      </View>
    );
  }

  if (Platform.OS !== "web" && isExpoGo) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <AppText
            style={{
              textAlign: "center",
              padding: 20,
              fontFamily: fonts.bodyMedium,
            }}
          >
            MapLibre requires a native build.{"\n"}Please run: npx expo run
          </AppText>
        </View>
      </View>
    );
  }

  const showMapPlaceholder =
    Platform.OS !== "web" &&
    (!mapComponents || apiStatus !== "ready" || isInitializing);
  const { Map, Camera, GeoJSONSource, Layer, Marker, UserLocation } =
    (mapComponents || {}) as any;
  const showConsentOverlay =
    !hasMap &&
    consentStatus === null &&
    !isInitializing &&
    !isDownloading &&
    !isNavigating &&
    !isCalculatingRoute &&
    !showPointPicker &&
    !isSelectingPin &&
    Platform.OS !== "web";
  const showDownloadErrorOverlay =
    mbtilesError &&
    !hasMap &&
    consentStatus !== "dismissed" &&
    Platform.OS !== "web";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {Platform.OS === "web" ? (
          <WebMapView
            currentRegion={currentRegion}
            waypoints={waypoints}
            selectedWaypoint={selectedWaypoint}
            onSelectWaypoint={(wp) => {
              setSelectedWaypoint(wp);
              setDestinationPoint(wp);
            }}
            isDark={isDark}
            mainRouteCoordinates={mainRouteCoordinates as any}
            orangeRouteCoordinates={orangeRouteCoordinates as any}
            activeRouteCoordinates={
              (isNavigating && activeNavRouteData
                ? activeNavRouteData
                : activeRouteRef.current)?.features?.[0]?.geometry
                ?.coordinates as any
            }
            stopPoints={stopPoints}
            isSelectingPin={isSelectingPin}
            onRegionChange={(lat, lng) => {
              mapCenterRef.current = { lat, lng };
              setMapCenter({ lat, lng });
            }}
            onMapClick={() => { }}
            cameraRef={cameraRef}
          />
        ) : showMapPlaceholder ? (
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <Map
            key={`map-${hasMap ? "offline" : "online"}-${mapTimestamp}`}
            ref={mapRef}
            style={styles.map}
            mapStyle={getMapStyle(isDark, hasMap, downloadedMapFiles)}
            compass={false}
            touchRotate={true}
            touchPitch={true}
            rotateEnabled={true}
            pitchEnabled={true}
            onLayout={(e: import("react-native").LayoutChangeEvent) => {
              mapViewSizeRef.current = {
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              };
            }}
            onDidFinishLoadingMap={() => {
              setIsMapLoaded(true);
              const validCoords = getValidPoiCoords(waypoints);
              if (validCoords.length > 0 && !hasCenteredOnce.current) {
                hasCenteredOnce.current = true;
                setTimeout(() => {
                  fitRouteToCamera(validCoords, 500);
                  setIsMapReady(true);
                }, 200);
              }
            }}
            onPress={(event: any) => {
              if (isTappingMarker.current) return;
              if (isNavigating) return;
            }}
            onRegionIsChanging={(feature: any) => {
              const bearing =
                feature?.properties?.bearing ??
                feature?.properties?.heading ??
                feature?.nativeEvent?.bearing ??
                feature?.bearing;
              if (typeof bearing === "number" && !isNaN(bearing)) {
                mapBearingRef.current = bearing;
                mapBearingAnim.setValue(bearing);
              }
              // Fires continuously during drag — update the pin marker in real-time
              // so it tracks the map center as the user pans.
              if (!isSelectingPinRef.current) return;
              // MapLibre passes a GeoJSON Feature: center is geometry.coordinates = [lng, lat]
              const center =
                feature?.geometry?.coordinates ??
                feature?.nativeEvent?.center ??
                feature?.center;
              if (Array.isArray(center) && center.length === 2) {
                const [lng, lat] = center;
                if (!isNaN(lng) && !isNaN(lat)) {
                  if (Math.abs(lng) < 1 && Math.abs(lat) < 1) return;
                  mapCenterRef.current = { lng, lat };
                  // Update the marker so it follows the map center live
                  setDropPinPreviewCoordinate({
                    longitude: lng,
                    latitude: lat,
                  });
                }
              }
            }}
            onRegionDidChange={(feature: any) => {
              const bearing =
                feature?.properties?.bearing ??
                feature?.properties?.heading ??
                feature?.nativeEvent?.bearing ??
                feature?.bearing;
              if (typeof bearing === "number" && !isNaN(bearing)) {
                mapBearingRef.current = bearing;
                mapBearingAnim.setValue(bearing);
              }
              // MapLibre passes a GeoJSON Feature: center is geometry.coordinates = [lng, lat]
              const center =
                feature?.geometry?.coordinates ??
                feature?.properties?.center ??
                feature?.nativeEvent?.center ??
                feature?.center;
              if (Array.isArray(center) && center.length === 2) {
                const [lng, lat] = center;
                if (isNaN(lng) || isNaN(lat)) return;

                // When MapLibre initializes or reloads a style, it emits [0, 0] (Null Island).
                // Snap directly to POI coordinates or default region
                if (Math.abs(lng) < 1 && Math.abs(lat) < 1) {
                  const validCoords = getValidPoiCoords(waypoints);
                  if (validCoords.length > 0 && cameraRef.current) {
                    fitRouteToCamera(validCoords, 0);
                  } else if (currentRegion && cameraRef.current) {
                    cameraRef.current?.easeTo({
                      center: [currentRegion.longitude, currentRegion.latitude],
                      duration: 0,
                    });
                  }
                  return;
                }

                // Keep ref always fresh for immediate confirm reads
                mapCenterRef.current = { lng, lat };
                setMapCenter({ lng, lat });
                if (isSelectingPinRef.current) {
                  setDropPinPreviewCoordinate({
                    longitude: lng,
                    latitude: lat,
                  });
                }
              }
            }}
          >
            {currentRegion && (
              <Camera
                ref={cameraRef}
                padding={
                  isSelectingPin
                    ? {
                      paddingLeft: 0,
                      paddingRight: 0,
                      paddingTop: 0,
                      paddingBottom: 0,
                    }
                    : undefined
                }
                initialViewState={{
                  center: [
                    currentRegion.longitude,
                    currentRegion.latitude,
                  ],
                  zoom: mapSettingsData?.default_zoom_level
                    ? parseFloat(mapSettingsData.default_zoom_level)
                    : 9,
                  bearing: 0,
                  pitch: 0,
                }}
                minZoom={3.5}
              />
            )}
            {/* Built-in blue dot GPS — shown when not navigating, OR when navigating from a selected Elk Waypoint */}
            {(!isNavigating || !isFromCurrentLocation) && (
              <UserLocation
                animated
                heading={false}
                minDisplacement={0}
              />
            )}

            {/* Custom heading arrow shown ONLY when navigating from current location */}
            {isNavigating && isFromCurrentLocation && displayLocation && (
              <Marker
                id="user-heading-arrow"
                lngLat={[displayLocation.longitude, displayLocation.latitude]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                {/* Pulse ring behind the arrow */}
                <View style={styles.userArrowContainer}>
                  <View style={styles.userArrowPulse} />
                  <Animated.View
                    style={[
                      styles.userArrowInner,
                      {
                        transform: [
                          {
                            rotate: arrowRotation.interpolate({
                              inputRange: [-720, 720],
                              outputRange: ["-720deg", "720deg"],
                            }),
                          },
                        ],
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
              activeRouteData={isNavigating ? activeNavRouteData : activeRouteRef.current}
              routeVersion={routeVersion}
              isNavigating={isNavigating}
              highlightedRoute={highlightedRoute}
              onRoutePress={handleRoutePress}
            />

            {/* Territory labels */}
            <GeoJSONSource
              id="territory-label-source"
              data={territoryLabelFeature}
            >
              <Layer
                id="territory-labels"
                type="symbol"
                layout={{
                  "text-field": ["get", "name"],
                  "text-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    7,
                    12,
                    11,
                    18,
                  ],
                  "text-font": ["Open Sans Bold"],
                  "text-letter-spacing": 0.05,
                  "text-transform": "uppercase",
                  "text-allow-overlap": false,
                }}
                paint={{
                  "text-color": "#4f5f4b",
                  "text-halo-color": "#eef1e7",
                  "text-halo-width": 2,
                  "text-opacity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    7,
                    0.75,
                    10,
                    0.45,
                    12,
                    0,
                  ],
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
                disabled={isNavigating}
                Marker={Marker}
              />
            ))}

            {/* Intermediate stop point markers (rendered ONLY for dropped pins) */}
            {stopPoints
              .filter((stop) => stop.title === "Dropped Pin" || stop.id < 0)
              .map((stop, idx) => (
                <Marker
                  key={`stop-point-${stop.id}-${idx}`}
                  id={`stop-point-${stop.id}-${idx}`}
                  lngLat={[stop.coordinate.longitude, stop.coordinate.latitude]}
                  anchor={{ x: 0.5, y: 1.0 }}
                  onPress={() => !isNavigating && setSelectedWaypoint(stop)}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedWaypoint(stop)}
                    disabled={isNavigating}
                    activeOpacity={isNavigating ? 1 : 0.8}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    style={styles.routePinBadgeContainer}
                  >
                    <View
                      style={[
                        styles.routePinBadge,
                        { backgroundColor: "#E65100" },
                      ]}
                    >
                      <MaterialIcons name="place" size={14} color="#FFFFFF" />
                      <AppText
                        style={styles.routePinBadgeText}
                      >{`Stop ${idx + 1}`}</AppText>
                    </View>
                    <View
                      style={[
                        styles.routePinPinhead,
                        { borderTopColor: "#E65100" },
                      ]}
                    />
                  </TouchableOpacity>
                </Marker>
              ))}
          </Map>
        )}

        {/* Absolute loader overlay to hide initial [0, 0] Africa loading frame and camera snap */}
        {Platform.OS !== "web" && !showMapPlaceholder && !isMapReady && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.surface,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 999,
              },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* OSM & CARTO Attribution Overlay */}
        <View style={styles.attributionContainer} pointerEvents="none">
          <AppText style={styles.attributionText}>
            {"© OpenStreetMap contributors | © CARTO"}
          </AppText>
        </View>

        {/* ── Drop-pin mode: crosshair ── */}
        {isSelectingPin && (
          <View style={styles.crosshairContainer} pointerEvents="none">
            <View style={styles.crosshairTarget}>
              <View style={styles.crosshairOuter}>
                <View style={styles.crosshairInner} />
              </View>
            </View>
          </View>
        )}

        {/* ── Processing Indicator (Floating on Map) ── */}
        {isCalculatingRoute && !showPointPicker && (
          <View
            style={{
              position: "absolute",
              top: 350,
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: 100,
            }}
            pointerEvents="none"
          >
            <View
              style={{
                backgroundColor: isDark ? "#2E3B2F" : "#FFFFFF",
                padding: 12,
                borderRadius: 22,
                alignItems: "center",
                flexDirection: "row",
                elevation: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              }}
            >
              <ActivityIndicator
                size="small"
                color={brandPrimary || colors.primary}
                style={{ marginRight: 12 }}
              />
              <AppText
                style={{
                  fontSize: 14,
                  fontFamily: "OpenSans-SemiBold",
                  color: isDark ? "#FFFFFF" : "#000000",
                }}
              >
                Processing...
              </AppText>
            </View>
          </View>
        )}

        {/* Full-width Title & Search bar + Side Controls */}
        {!isNavigating && !showPointPicker && !isSelectingPin && (
          <>
            <Reanimated.View
              style={[
                styles.fullWidthHeaderContainer,
                headerContainerAnimatedStyle,
              ]}
            >
              <Reanimated.View
                style={[navAreaAnimatedStyle, { overflow: "hidden" }]}
                pointerEvents={showHeader ? "auto" : "none"}
              >
                <Navbar />
                <View>
                  <QuickLinks />
                </View>
              </Reanimated.View>

              {!isSearching ? (
                <View style={styles.fullWidthHeaderRow}>
                  <View style={{ flex: 1, marginTop: 4 }}>
                    <SectionHeader
                      title={
                        isValidData(mapSettingsData?.screen_title)
                          ? (mapSettingsData?.screen_title ?? "")
                          : ""
                      }
                      iconSource={require("../../assets/images/mapicon.png")}
                      primaryColor={brandPrimary || "#000000"}
                      secondaryColor={brandSecondary || "#ea0b0b"}
                      isDark={isDark}
                      showToggleArrow={true}
                      isCollapsed={!showHeader}
                      onTogglePress={() => setShowHeader((prev) => !prev)}
                    />
                    {/* ── Processing Indicator removed from here ── */}
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    marginHorizontal: 16,
                    marginBottom: 12,
                    position: "relative",
                    zIndex: 110,
                  }}
                >
                  <View style={styles.searchBar}>
                    <MaterialIcons
                      name="search"
                      size={22}
                      color={colors.onSurfaceVariant}
                      style={styles.searchIcon}
                    />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search viewing areas..."
                      placeholderTextColor={`${colors.onSurfaceVariant}80`}
                      value={searchQuery}
                      autoFocus
                      onChangeText={(text) => {
                        setSearchQuery(text);
                        setShowSearchResults(text.length > 0);
                      }}
                      onFocus={() =>
                        searchQuery.length > 0 && setShowSearchResults(true)
                      }
                      onBlur={() => {
                        // Small timeout so item presses register before blur hides it
                        setTimeout(() => {
                          setShowSearchResults(false);
                          if (searchQuery.length === 0) {
                            setIsSearching(false);
                          }
                        }, 200);
                      }}
                    />

                    <TouchableOpacity
                      onPress={() => {
                        if (searchQuery.length > 0) {
                          setSearchQuery("");
                          setShowSearchResults(false);
                        } else {
                          setIsSearching(false);
                        }
                      }}
                    >
                      <MaterialIcons
                        name="close"
                        size={20}
                        color={colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Search results dropdown relative to the searchBar */}
                  {showSearchResults && searchResults.length > 0 && (
                    <View
                      style={[
                        styles.searchResultsDropdown,
                        { top: 56, left: 0, right: 0 },
                      ]}
                    >
                      {searchResults.slice(0, 5).map((wp) => (
                        <TouchableOpacity
                          key={wp.id}
                          style={styles.searchResultItem}
                          onPress={() => {
                            handleSelectSearchResult(wp);
                            setIsSearching(false);
                          }}
                        >
                          <MaterialIcons
                            name="place"
                            size={18}
                            color={brandPrimary || colors.primary}
                          />
                          <View style={styles.searchResultText}>
                            <AppText
                              style={styles.searchResultTitle}
                              numberOfLines={1}
                            >
                              {wp.title}
                            </AppText>
                            <AppText
                              style={styles.searchResultDesc}
                              numberOfLines={1}
                            >
                              {wp.description}
                            </AppText>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </Reanimated.View>

            <View
              style={[
                styles.sideControls,
                {
                  bottom: selectedWaypoint
                    ? insets.bottom + 245
                    : insets.bottom + 90,
                },
              ]}
            >
              {/* 1. Compass direction button */}
              <TouchableOpacity
                style={styles.sideButton}
                onPress={handleResetNorth}
                activeOpacity={0.8}
                accessibilityLabel="Reset map to North"
                accessibilityRole="button"
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: mapBearingAnim.interpolate({
                          inputRange: [-360, 360],
                          outputRange: ["360deg", "-360deg"],
                        }),
                      },
                    ],
                  }}
                >
                  <CompassNeedle size={26} />
                </Animated.View>
              </TouchableOpacity>

              {/* 2. Route Planner / Navigation button */}
              <TouchableOpacity
                style={styles.sideButton}
                onPress={() => handleNavigate(selectedWaypoint || undefined)}
                activeOpacity={0.8}
                accessibilityLabel="Route planner"
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="navigation"
                  size={24}
                  color={colors.error}
                  style={{ transform: [{ rotate: "45deg" }] }}
                />
              </TouchableOpacity>

              {/* 3. Location recenter button */}
              <TouchableOpacity
                style={styles.sideButton}
                onPress={handleRecenter}
                activeOpacity={0.8}
                accessibilityLabel="My location"
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="my-location"
                  size={24}
                  color={colors.onSurface}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Offline indicator with coordinates (Bottom-Left) ── */}
        {netInfo.isConnected === false &&
          !isNavigating &&
          !showPointPicker &&
          !isSelectingPin && (
            <Reanimated.View
              entering={FadeInDown.duration(300)}
              exiting={FadeOutDown.duration(200)}
              style={[
                styles.offlineIndicatorContainer,
                {
                  bottom:
                    (selectedWaypoint
                      ? insets.bottom + 205
                      : insets.bottom + 90) + (highlightedRoute ? 52 : 0),
                },
              ]}
            >
              <View style={styles.offlineIndicatorCard}>
                <MaterialIcons
                  name="wifi-off"
                  size={16}
                  color={isDark ? "#ff6b6b" : "#d93838"}
                />
                <View>
                  <AppText style={styles.offlineIndicatorTitle}>
                    Offline Mode
                  </AppText>
                  {location ? (
                    <AppText style={styles.offlineIndicatorCoords}>
                      {location.latitude.toFixed(5)},{" "}
                      {location.longitude.toFixed(5)}
                    </AppText>
                  ) : (
                    <AppText style={styles.offlineIndicatorCoords}>
                      Acquiring GPS...
                    </AppText>
                  )}
                </View>
              </View>
            </Reanimated.View>
          )}

        {/* ── Route Tooltip (Custom Bottom-Left Message) ── */}
        {highlightedRoute &&
          !isNavigating &&
          !showPointPicker &&
          !isSelectingPin && (
            <Reanimated.View
              entering={FadeInDown.duration(300)}
              exiting={FadeOutDown.duration(200)}
              style={[
                styles.routeTooltipContainer,
                {
                  bottom: selectedWaypoint
                    ? insets.bottom + 205
                    : insets.bottom + 90,
                },
              ]}
            >
              <View style={styles.routeTooltipCard}>
                <View
                  style={[
                    styles.routeTooltipDot,
                    {
                      backgroundColor:
                        highlightedRoute === "main" ? "#FFD700" : "#ff8a00",
                    },
                  ]}
                />
                <View>
                  <AppText style={styles.routeTooltipTitle}>
                    {highlightedRoute === "main"
                      ? "Elk Scenic Drive"
                      : "Alternate Route"}
                  </AppText>
                </View>
                <TouchableOpacity
                  style={styles.routeTooltipClose}
                  onPress={() => setHighlightedRoute(null)}
                >
                  <MaterialIcons
                    name="close"
                    size={16}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>
            </Reanimated.View>
          )}

        {/* ── Waypoint carousel (hidden during navigation and pin selection) ── */}
        {selectedWaypoint &&
          !isNavigating &&
          !showPointPicker &&
          !isSelectingPin && (
            <Reanimated.View
              entering={FadeInDown.duration(300).delay(150)}
              exiting={FadeOutDown.duration(200)}
              style={[styles.hotspotCardContainer, { bottom: 0 }]}
            >
              <FlatList
                ref={flatListRef}
                data={waypoints}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScrollEnd}
                keyExtractor={(item) => `hotspot-${item.id}`}
                getItemLayout={(_, index) => ({
                  length: windowWidth,
                  offset: windowWidth * index,
                  index,
                })}
                initialScrollIndex={
                  waypoints.findIndex((w) => w.id === selectedWaypoint.id) !==
                    -1
                    ? waypoints.findIndex((w) => w.id === selectedWaypoint.id)
                    : 0
                }
                removeClippedSubviews={false}
                initialNumToRender={waypoints.length}
                maxToRenderPerBatch={waypoints.length}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: false,
                    });
                  }, 50);
                }}
                renderItem={renderWaypointCard}
              />
            </Reanimated.View>
          )}

        {/* ── Route planner (full-screen picker) ── */}
        <RoutePlanner
          isVisible={showPointPicker}
          startPoint={startPoint}
          destinationPoint={destinationPoint}
          stopPoints={stopPoints}
          location={location}
          isCalculatingRoute={isCalculatingRoute}
          pickerType={pickerType}
          onClose={() => setShowPointPicker(false)}
          onSetStartPoint={setStartPoint}
          onSetDestinationPoint={setDestinationPoint}
          onAddStop={(wp) => setStopPoints((prev) => [...prev, wp])}
          onRemoveStop={(idx) =>
            setStopPoints((prev) => prev.filter((_, i) => i !== idx))
          }
          onUpdateStop={(idx, wp) =>
            setStopPoints((prev) => prev.map((s, i) => (i === idx ? wp : s)))
          }
          onSetPickerType={setPickerType}
          onSelectOnMap={(type, stopIndex) => {
            setPinPickerType(type);
            if (type === "stop" && stopIndex !== undefined) {
              setPinPickerStopIndex(stopIndex);
            }
            // Reset camera padding so MapLibre center is 100% aligned with physical screen center
            try {
              const currentCenter = mapCenterRef.current
                ? [mapCenterRef.current.lng, mapCenterRef.current.lat]
                : currentRegion
                  ? [currentRegion.longitude, currentRegion.latitude]
                  : undefined;
              if (currentCenter && cameraRef.current?.easeTo) {
                cameraRef.current.easeTo({
                  center: currentCenter,
                  padding: {
                    paddingLeft: 0,
                    paddingRight: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                  },
                  duration: 150,
                });
              }
            } catch (e) {
              console.warn("[DropPin] Reset camera padding failed:", e);
            }
            // Set the initial pin coordinate immediately from the current map center
            // so the Marker mounts ONCE at activation, not on the first pan event.
            if (mapCenterRef.current) {
              setDropPinPreviewCoordinate({
                longitude: mapCenterRef.current.lng,
                latitude: mapCenterRef.current.lat,
              });
            } else if (currentRegion) {
              setDropPinPreviewCoordinate({
                longitude: currentRegion.longitude,
                latitude: currentRegion.latitude,
              });
            }
            isSelectingPinRef.current = true;
            setIsSelectingPin(true);
            setShowPointPicker(false);
          }}
          onStartNavigation={(from, to, stops) => {
            // Manual route via RoutePlanner overrides the "go back" behavior
            hasHandledNavParam.current = false;
            startActualNavigation(from, to, stops);
          }}
        />

        {/* ── Navigation mode: premium header + HUD ── */}
        {isNavigating && (
          <>
            <NavigationHeader
              fromTitle={startPoint?.title ?? "Starting point"}
              toTitle={destinationPoint?.title ?? "Destination"}
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
              onResetNorth={handleResetNorth}
              mapBearingAnim={mapBearingAnim}
            />
          </>
        )}

        {/* ── Arrival popup modal ── */}
        {showArrivalPopup && (
          <View style={styles.modalOverlay}>
            <View style={styles.arrivalCard}>
              <View style={styles.arrivalIconContainer}>
                <MaterialIcons
                  name="location-on"
                  size={40}
                  color={colors.onPrimary}
                />
              </View>
              <AppText style={styles.arrivalTitle}>
                {"You've Reached Your Destination"}
              </AppText>
              <AppText style={styles.arrivalSubtitle}>
                {destinationPoint?.title ?? "Your destination"}
              </AppText>
              <AppText style={styles.arrivalDescription}>
                Enjoy your time in elk country. Remember to follow wildlife
                safety guidelines and respect viewing area rules.
              </AppText>
              <TouchableOpacity
                style={styles.arrivalButton}
                onPress={() => {
                  setShowArrivalPopup(false);
                  handleExitNavigation();
                }}
              >
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={colors.onPrimary}
                />
                <AppText style={styles.arrivalButtonText}>Done</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isSelectingPin && (
          <>
            {/* Top label */}
            <View style={[styles.pinLabelBar, { top: insets.top + 12 }]}>
              <MaterialIcons
                name="location-searching"
                size={18}
                color={colors.primary}
              />
              <AppText style={styles.pinLabelText}>
                Move map to place{" "}
                {pinPickerType === "start"
                  ? "start"
                  : pinPickerType === "stop"
                    ? "stop"
                    : "destination"}
              </AppText>
            </View>
            {/* Compass direction indicator */}
            {location && (
              <TouchableOpacity
                style={[styles.compassContainer, { top: insets.top + 60 }]}
                onPress={handleResetNorth}
                activeOpacity={0.8}
                accessibilityLabel="Reset map to North"
                accessibilityRole="button"
              >
                <Animated.View
                  style={[
                    styles.compassArrow,
                    {
                      transform: [
                        {
                          rotate: mapBearingAnim.interpolate({
                            inputRange: [-360, 360],
                            outputRange: ["360deg", "-360deg"],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <CompassNeedle size={26} />
                </Animated.View>
              </TouchableOpacity>
            )}

            {/* Bottom confirm / cancel */}
            <View
              style={[styles.pinActionBar, { bottom: insets.bottom + 100 }]}
            >
              <TouchableOpacity
                style={styles.pinCancelBtn}
                onPress={() => {
                  isSelectingPinRef.current = false;
                  setIsSelectingPin(false);
                  setShowPointPicker(true);
                }}
              >
                <MaterialIcons name="close" size={20} color={colors.primary} />
                <AppText style={styles.pinCancelText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pinConfirmBtn}
                onPress={() => {
                  const lng =
                    dropPinPreviewCoordinate?.longitude ??
                    mapCenterRef.current?.lng ??
                    currentRegion?.longitude ??
                    0;
                  const lat =
                    dropPinPreviewCoordinate?.latitude ??
                    mapCenterRef.current?.lat ??
                    currentRegion?.latitude ??
                    0;

                  const pin: Waypoint = {
                    id: -Date.now(),
                    title: "Dropped Pin",
                    coordinate: { longitude: lng, latitude: lat },
                    description: "Custom point selected on map",
                  };
                  setDropPinPreviewCoordinate(pin.coordinate);
                  if (pinPickerType === "start") {
                    setStartPoint(pin);
                  } else if (pinPickerType === "stop") {
                    if (pinPickerStopIndex !== null) {
                      setStopPoints((prev) =>
                        prev.map((s, i) =>
                          i === pinPickerStopIndex ? pin : s,
                        ),
                      );
                    } else {
                      setStopPoints((prev) => [...prev, pin]);
                    }
                  } else {
                    setDestinationPoint(pin);
                  }
                  setPinPickerStopIndex(null);
                  isSelectingPinRef.current = false;
                  setIsSelectingPin(false);
                  setShowPointPicker(true);
                }}
              >
                <MaterialIcons name="check" size={20} color="white" />
                <AppText style={styles.pinConfirmText}>
                  Confirm Location
                </AppText>
              </TouchableOpacity>
            </View>
          </>
        )}
        {/* ── Download consent overlay ── */}
        {showConsentOverlay && (
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                {
                  width: Math.min(windowWidth * 0.92, 380),
                  padding: 24,
                },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  saveConsent("dismissed", true);
                  const validCoords = getValidPoiCoords(waypoints);
                  if (validCoords.length > 0) {
                    fitRouteToCamera(validCoords, 500);
                  }
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <AppText
                style={[
                  styles.modalTitle,
                  {
                    fontSize: 22,
                    fontFamily: fonts.bodyBold,
                    marginBottom: 12,
                  },
                ]}
              >
                Explore Without Limits
              </AppText>
              <AppText
                style={[
                  styles.modalDescription,
                  { fontSize: 14, fontFamily: fonts.body, marginBottom: 14 },
                ]}
              >
                Cellular signal is limited in Elk Country. Download the offline regional map now to navigate trails and points of interest without an internet connection.
              </AppText>

              <View style={styles.sizeBadge}>
                <MaterialIcons
                  name="cloud-download"
                  size={16}
                  color={brandSecondary || "#ea0b0b"}
                  style={{ marginRight: 6 }}
                />
                <AppText style={styles.sizeBadgeText}>
                  Download Size: ~307 MB
                </AppText>
              </View>

              <View style={[styles.modalActions, { flexDirection: "column", gap: 10, width: "100%" }]}>
                <TouchableOpacity
                  style={[
                    styles.modalButtonPrimary,
                    { height: 46, width: "100%", alignSelf: "center", backgroundColor: brandSecondary || "#ea0b0b", borderRadius: 23 },
                  ]}
                  onPress={() => {
                    saveConsent("yes");
                    downloadMap();
                  }}
                  activeOpacity={0.8}
                >
                  <AppText
                    style={[
                      styles.modalButtonTextPrimary,
                      { fontSize: 14, fontFamily: fonts.bodyBold, color: "#FFFFFF" },
                    ]}
                  >
                    Continue
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    height: 46,
                    width: "100%",
                    alignSelf: "center",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 23,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: isDark ? "#FFFFFF" : "#D1D5DB",
                  }}
                  onPress={() => {
                    saveConsent("dismissed", true);
                    const validCoords = getValidPoiCoords(waypoints);
                    if (validCoords.length > 0) {
                      fitRouteToCamera(validCoords, 500);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <AppText
                    style={{
                      fontSize: 14,
                      fontFamily: fonts.bodyBold,
                      color: "#111111",
                    }}
                  >
                    Decline
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Download in-progress overlay ── */}
        {isDownloading && (
          <View
            style={[
              styles.loadingContainer,
              StyleSheet.absoluteFillObject,
              {
                zIndex: 1000,
                backgroundColor: colors.surface,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText style={styles.loadingText}>Downloading Map Data...</AppText>
            <AppText
              style={{
                ...styles.loadingText,
                marginTop: 5,
                fontSize: 14,
                opacity: 0.8,
                marginBottom: 24,
              }}
            >
              {downloadProgress < 0
                ? "Starting..."
                : `${Math.max(0, Math.round(downloadProgress * 100))}%`}
            </AppText>
            <TouchableOpacity
              style={{
                height: 44,
                paddingHorizontal: 24,
                backgroundColor: colors.surfaceContainerLowest,
                borderWidth: 1.5,
                borderColor: colors.error,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 8,
              }}
              onPress={() => cancelDownload()}
            >
              <AppText
                style={{
                  fontSize: 14,
                  fontFamily: fonts.bodyBold,
                  color: colors.error,
                }}
              >
                Cancel Download
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Download error overlay ── */}
        {showDownloadErrorOverlay && (
          <View style={styles.errorToastContainer}>
            <View style={styles.errorToastIcon}>
              <MaterialIcons
                name="error-outline"
                size={24}
                color={colors.error}
              />
            </View>
            <View style={styles.errorToastTextContent}>
              <AppText style={styles.errorToastTitle}>
                Something went wrong
              </AppText>
              <AppText style={styles.errorToastDescription}>
                Map download failed. Online map active.
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => saveConsent("dismissed", true)}
              style={styles.errorToastClose}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
        )}
        {/* Duplicate / same location warning modal */}
        <SameLocationPopup
          visible={showSameLocationPopup}
          onClose={() => setShowSameLocationPopup(false)}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const createStyles = (
  colors: typeof LIGHT_COLORS,
  fonts: typeof LIGHT_FONTS,
  isDark: boolean,
  brandPrimary: string | undefined,
  brandSecondary: string | undefined,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF", height: "100%" },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    loadingText: {
      marginTop: 10,
      fontFamily: fonts.bodyMedium,
      color: colors.onSurfaceVariant,
    },
    map: { ...StyleSheet.absoluteFillObject },
    topHeaderContainer: {
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#E0E0E0",
      zIndex: 50,
      elevation: 50,
    },
    mapContainer: {
      flex: 1,
      position: "relative",
      height: "100%",
    },

    // Floating Title
    floatingTitleContainer: {
      position: "absolute",
      top: 16,
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 15,
    },
    floatingTitleCapsule: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? colors.surface : "#FFFFFF",
      borderRadius: 99,
      paddingHorizontal: 20,
      paddingVertical: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    floatingTitleText: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: isDark ? colors.onSurface : "#000000",
    },

    // Search bar
    fullWidthHeaderContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      zIndex: 10,
      backgroundColor: isDark ? colors.surface : "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + "40",
    },

    // Offline indicator
    offlineIndicatorContainer: {
      position: "absolute",
      left: 16,
      zIndex: 90,
    },
    offlineIndicatorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: isDark
        ? "rgba(30, 30, 30, 0.9)"
        : "rgba(255, 255, 255, 0.9)",
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    offlineIndicatorTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      color: isDark ? "#ff6b6b" : "#d93838",
    },
    offlineIndicatorCoords: {
      fontFamily: fonts.caption,
      fontSize: 10,
      color: colors.onSurfaceVariant,
      marginTop: 1,
    },

    // Route Tooltip
    routeTooltipContainer: {
      position: "absolute",
      left: 16,
      zIndex: 90,
    },
    routeTooltipCard: {
      flexDirection: "row",
      backgroundColor: isDark ? colors.surface : "#FFFFFF",
      padding: 8,
      paddingRight: 12,
      borderRadius: 99,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
      borderWidth: 1,
      borderColor: brandPrimary + "30",
      alignItems: "center",
    },
    routeTooltipDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: 10,
      marginLeft: 4,
    },
    routeTooltipTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: isDark ? colors.onSurface : brandPrimary,
    },
    routeTooltipClose: {
      padding: 6,
      marginLeft: 10,
      backgroundColor: isDark ? colors.surfaceContainer : "#F2F4F3",
      borderRadius: 16,
    },
    fullWidthHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    searchIconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
      marginBottom: 12,
      backgroundColor: isDark ? colors.surfaceContainer : "#F2F4F3",
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? colors.surfaceContainer : "#F2F4F3",
      borderRadius: 99,
      paddingHorizontal: 16,
      height: 52,
      width: "auto",
      borderWidth: 1,
      borderColor: colors.outlineVariant + "1a", // 10% opacity
    },
    searchIcon: { marginRight: 12 },
    searchInput: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.onSurface,
      padding: 0,
    },
    searchResultsDropdown: {
      position: "absolute",
      left: 16,
      right: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 16,
      elevation: 8,
      maxHeight: 280,
      overflow: "hidden",
    },
    searchResultItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + "1a",
    },
    searchResultText: { flex: 1 },
    searchResultTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.onSurface,
      textTransform: "capitalize",
    },
    searchResultDesc: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      marginTop: 2,
    },

    // Side controls
    sideControls: { position: "absolute", right: 24, zIndex: 10, gap: 16 },
    sideButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface + "f2", // 95% opacity
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33", // 20% opacity
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 12,
      elevation: 4,
    },

    // Waypoint carousel
    hotspotCardContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 10,
    },
    hotspotCard: {
      backgroundColor: isDark ? colors.surface : "#FFFFFF",
      borderRadius: 0,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    hotspotTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: isDark ? colors.onSurface : "#000000",
      flex: 1,
      textTransform: "capitalize",
    },
    cardCloseButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#000000",
      justifyContent: "center",
      alignItems: "center",
    },
    hotspotDescription: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: isDark ? colors.onSurfaceVariant : "#333333",
      lineHeight: 18,
      marginBottom: 16,
    },
    cardFooterRow: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
    },
    viewMoreButton: {
      backgroundColor: isDark ? colors.surfaceVariant : brandPrimary,
      borderRadius: 99,
      paddingVertical: 13,
      paddingHorizontal: 20,
    },
    viewMoreButtonText: {
      fontFamily: "OpenSans-Regular",
      fontWeight: "400",
      fontStyle: "normal",
      fontSize: 14,
      lineHeight: 14,
      letterSpacing: 0,
      color: isDark ? colors.onSurface : "#ffffff",
    },

    // Drop-pin crosshair
    crosshairContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 500,
    },
    crosshairTarget: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: "center",
      alignItems: "center",
    },
    crosshairOuter: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 2.5,
      borderColor: brandPrimary,
      backgroundColor: addOpacity(brandPrimary, "1f"), // 12% opacity
      justifyContent: "center",
      alignItems: "center",
    },
    crosshairInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.error,
      borderWidth: 2,
      borderColor: isDark ? colors.surface : "white",
    },
    pinLabelBar: {
      position: "absolute",
      left: 24,
      right: 24,
      zIndex: 600,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: addOpacity(colors.surface, "f2"), // 95% opacity
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 99,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    pinLabelText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: brandPrimary,
      flex: 1,
    },
    compassContainer: {
      position: "absolute",
      right: 16,
      zIndex: 600,
      alignItems: "center",
      backgroundColor: colors.surface + "f7",
      width: 54,
      height: 54,
      borderRadius: 27,
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0,0,0,0.08)",
    },
    compassArrow: {
      alignItems: "center",
      justifyContent: "center",
    },
    pinActionBar: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 600,
      flexDirection: "row",
      gap: 12,
    },
    pinCancelBtn: {
      flex: 1,
      height: 52,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.outline,
      backgroundColor: colors.surface + "f7",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    pinCancelText: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: brandPrimary,
    },
    pinConfirmBtn: {
      flex: 2,
      height: 52,
      borderRadius: 12,
      backgroundColor: brandPrimary,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    pinConfirmText: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.onPrimary,
    },

    // Route & Stop point pin badge styles
    routePinBadgeContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    routePinBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 4,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    routePinBadgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      color: "#FFFFFF",
      maxWidth: 110,
    },
    routePinPinhead: {
      width: 0,
      height: 0,
      backgroundColor: "transparent",
      borderStyle: "solid",
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 6,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      marginTop: -1,
    },

    // User heading arrow (navigation mode)
    userArrowContainer: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    userArrowPulse: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: addOpacity(brandPrimary, "26"), // 15% opacity
      borderWidth: 2,
      borderColor: addOpacity(brandPrimary, "4d"), // 30% opacity
    },
    userArrowInner: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: brandPrimary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    },

    // Waypoint markers
    waypointCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: brandPrimary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: isDark ? "#111413" : "white",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 3,
      elevation: 4,
    },
    waypointCircleSelected: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.tertiaryContainer,
      borderColor: brandPrimary,
    },
    waypointText: { color: colors.onPrimary, fontSize: 12, fontWeight: "bold" },

    // Modals
    // Modals
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? "rgba(0,0,0,0.65)" : "rgba(0, 0, 0, 0.65)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 100,
    },
    modalCard: {
      backgroundColor: isDark ? colors.surface : "#FFFFFF",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.15)" : "#CCCCCC",
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    closeButton: {
      position: "absolute",
      top: 14,
      right: 14,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#000000",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    sizeBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
    },
    sizeBadgeText: {
      fontSize: 13,
      fontFamily: fonts.bodyBold,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#374151",
    },
    modalIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryContainer,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
      marginTop: 12,
    },
    modalTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 32,
      color: brandPrimary,
      textAlign: "center",
      marginBottom: 16,
    },
    modalDescription: {
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.onSurfaceVariant,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
      paddingHorizontal: 8,
    },
    modalActions: { width: "100%", gap: 12 },
    modalButtonPrimary: {
      backgroundColor: brandPrimary,
      height: 52,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    },
    modalButtonTextPrimary: {
      color: colors.onPrimary,
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
    },
    modalButtonSecondary: {
      height: 48,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    },
    modalButtonTextSecondary: {
      color: brandPrimary,
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 32,
      gap: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.outline,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxChecked: {
      backgroundColor: brandPrimary,
      borderColor: brandPrimary,
    },
    checkboxLabel: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },

    // Error Toast
    errorToastContainer: {
      position: "absolute",
      bottom: 40,
      alignSelf: "center",
      width: "90%",
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 100, // Pill shape for modern look
      padding: 12,
      paddingRight: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "40",
      zIndex: 100,
    },
    errorToastIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.error + "26", // 15% opacity of error color
      justifyContent: "center",
      alignItems: "center",
    },
    errorToastTextContent: {
      flex: 1,
    },
    errorToastTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.onSurface,
      marginBottom: 2,
    },
    errorToastDescription: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    errorToastClose: {
      padding: 8,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 20,
    },

    // Arrival popup
    arrivalCard: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: colors.surface + "f7",
      borderRadius: 28,
      padding: 32,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: isDark ? 0.4 : 0.2,
      shadowRadius: 40,
      elevation: 16,
    },
    arrivalIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: brandPrimary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    arrivalTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 26,
      color: brandPrimary,
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 32,
    },
    arrivalSubtitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.tertiary,
      textAlign: "center",
      marginBottom: 16,
    },
    arrivalDescription: {
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.onSurfaceVariant,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 28,
      paddingHorizontal: 8,
    },
    arrivalButton: {
      backgroundColor: brandPrimary,
      height: 56,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      width: "100%",
      shadowColor: "#000",
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
    attributionContainer: {
      position: "absolute",
      bottom: 8,
      left: 12,
      backgroundColor: isDark
        ? "rgba(46, 59, 47, 0.75)"
        : "rgba(255, 255, 255, 0.75)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      zIndex: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    attributionText: {
      fontSize: 10,
      fontFamily: fonts.body,
      color: isDark ? "#FFFFFF" : "#333333",
    },
  });
