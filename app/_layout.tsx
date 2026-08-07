import { Lexend_500Medium } from '@expo-google-fonts/lexend';
import {
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
} from '@expo-google-fonts/open-sans';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname, useSegments } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from "expo-status-bar";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, AppState, AppStateStatus, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/src/components/Navbar";
import OfflinePopup from "@/src/components/OfflinePopup";
import QuickLinks from "@/src/components/QuickLinks";
import SyncProgressScreen from "@/src/components/SyncProgressScreen";
import { useAppContentData, useAppContentSync } from "@/src/contexts/AppContentContext";

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

import "react-native-reanimated";
import Animated, { SharedValue, useSharedValue, useAnimatedStyle, interpolate } from 'react-native-reanimated';

import { ThemeProvider as CustomThemeProvider, useTheme } from "@/src/context/ThemeContext";
import { AppContentProvider } from "@/src/contexts/AppContentContext";
import { createTables, inspectDatabaseSchema } from "@/src/database/schema";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useNetInfo } from "@react-native-community/netinfo";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const MapResetContext = createContext<{ mapKey: number; resetMap: () => void }>({
  mapKey: 0,
  resetMap: () => { },
});

export function useMapReset() {
  return useContext(MapResetContext);
}

export const NavigationModeContext = createContext<{
  isNavigating: boolean;
  setIsNavigating: (v: boolean) => void;
  isBottomNavbarHidden: boolean;
  setIsBottomNavbarHidden: (v: boolean) => void;
  // Shared value: 0 = visible, 1 = hidden. Lives on UI thread, no React re-renders.
  navbarVisibility: SharedValue<number>;
}>({
  isNavigating: false,
  setIsNavigating: () => { },
  isBottomNavbarHidden: false,
  setIsBottomNavbarHidden: () => { },
  navbarVisibility: { value: 0 } as SharedValue<number>,
});

export function useNavigationMode() {
  return useContext(NavigationModeContext);
}



export const unstable_settings = {
  anchor: "(home)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { type } = useNetInfo();

  const [dbReady, setDbReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isBottomNavbarHidden, setIsBottomNavbarHidden] = useState(false);
  // Shared value: 0 = navbar visible, 1 = navbar hidden
  const navbarVisibility = useSharedValue(0);

  const [fontsLoaded] = useFonts({
    'EBGaramond-Medium': EBGaramond_500Medium,
    'EBGaramond-SemiBold': EBGaramond_600SemiBold,
    'EBGaramond-Bold': EBGaramond_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Lexend_500Medium': Lexend_500Medium,
    'OpenSans-Regular': OpenSans_400Regular,
    'OpenSans-SemiBold': OpenSans_600SemiBold,
    'OpenSans-Bold': OpenSans_700Bold,
    'Roboto-Regular': Roboto_400Regular,
    'Roboto-Medium': Roboto_500Medium,
    'Roboto-Bold': Roboto_700Bold,
  });

  const resetMap = useCallback(() => {
    setMapKey(k => k + 1);
    setIsNavigating(false);
  }, []);

  useEffect(() => {
    try {
      createTables();
      inspectDatabaseSchema();

      setDbReady(true);
    } catch (error) {
      console.log("Database Error:", error);
    }

  }, []);

  useEffect(() => {
    if (dbReady && fontsLoaded) {
      // Hide the native splash screen only once fonts and DB are ready
      SplashScreen.hideAsync();
    }
  }, [dbReady, fontsLoaded]);

  console.log("Network Type:", type);
  if (!dbReady || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colorScheme === "dark" ? "#121212" : "#F8F9FA",
        }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <AppContentProvider>
      <CustomThemeProvider>
        <MapResetContext.Provider value={{ mapKey, resetMap }}>
          <NavigationModeContext.Provider value={{ isNavigating, setIsNavigating, isBottomNavbarHidden, setIsBottomNavbarHidden, navbarVisibility }}>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <RootLayoutContent
                colorScheme={colorScheme}
                isNavigating={isNavigating}
              />
              <StatusBar style="light" backgroundColor="#0F0F0F" />
            </ThemeProvider>
          </NavigationModeContext.Provider>
        </MapResetContext.Provider>
      </CustomThemeProvider>
    </AppContentProvider>
  );
}

import BottomNavbar from "@/src/components/BottomNavbar";

function RootLayoutContent({ colorScheme, isNavigating }: { colorScheme: string | null | undefined, isNavigating: boolean }) {
  const { colors, isDark } = useTheme();
  const { brandData, apiStatus } = useAppContentData();
  const { refreshData } = useAppContentSync();
  const pathname = usePathname();
  const segments = useSegments();
  const primaryColor = brandData?.brand_color_primary || "#000000";
  const { navbarVisibility } = useNavigationMode();

  const QUICKLINKS_HEIGHT = 114;
  const quickLinksStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(navbarVisibility.value, [0, 1], [QUICKLINKS_HEIGHT, 0]),
      opacity: interpolate(navbarVisibility.value, [0, 1], [1, 0]),
      overflow: 'hidden',
    };
  });

  // Delta check on app resume or active timers
  useEffect(() => {
    if (apiStatus !== 'ready') return;

    // 30 minute active polling sync
    const timer = setInterval(() => {
      console.log("[Sync] Triggering scheduled 30m delta check.");
      refreshData();
    }, 30 * 1000);

    // Foreground listener
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log("[Sync] App foregrounded. Triggering delta update check.");
        refreshData();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [apiStatus]);

  if (apiStatus === 'fetching') {
    return <SyncProgressScreen />;
  }

  // Hide headers on splash (index) and modal routes
  const isSplash = (segments as any).length === 0 || ((segments as any).length === 1 && (segments as any)[0] === 'index');
  const isModal = pathname === '/modal';
  const isSettings = pathname === '/map/settings';
  const shouldShowHeader = !isSplash && !isModal && !isSettings && !isNavigating;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? colors.background : "#F8F9FA" }}>
      <OfflinePopup />
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen
            name="index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="(home)"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="programs/index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="programs/[id]"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="events/index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="events/[id]"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="trails/index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="rentals/index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="plan-trip/index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="map/index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="map/[id]"
            options={{ headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="map/settings"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="visitors/index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="cameras/index"
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              title: "Modal",
            }}
          />
          <Stack.Screen
            name="tips/index"
            options={{ headerShown: false, animation: 'none' }}
          />
        </Stack>
      </View>
      {shouldShowHeader && (
        <BottomNavbar />
      )}
    </View>
  );
}
