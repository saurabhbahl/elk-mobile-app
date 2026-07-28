import { Lexend_500Medium } from '@expo-google-fonts/lexend';
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, AppState, AppStateStatus, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/components/Navbar";
import OfflineBanner from "@/components/OfflineBanner";
import QuickLinks from "@/components/QuickLinks";
import SyncProgressScreen from "@/components/SyncProgressScreen";
import { useAppContent } from "@/contexts/AppContentContext";

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

import { ThemeProvider as CustomThemeProvider } from "@/context/ThemeContext";
import { AppContentProvider } from "@/contexts/AppContentContext";
import { createTables, inspectDatabaseSchema } from "@/database/schema";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNetInfo } from "@react-native-community/netinfo";

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
}>({
  isNavigating: false,
  setIsNavigating: () => { },
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

  const [fontsLoaded] = useFonts({
    'EBGaramond-Medium': EBGaramond_500Medium,
    'EBGaramond-SemiBold': EBGaramond_600SemiBold,
    'EBGaramond-Bold': EBGaramond_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Lexend_500Medium': Lexend_500Medium,
  });

  const resetMap = useCallback(() => {
    setMapKey(k => k + 1);
    setIsNavigating(false);
  }, []);

  useEffect(() => {
    try {
      createTables();
      inspectDatabaseSchema();
      // Temporary check to print database records
      const { MovieRepository } = require("@/database/repositories/movieRepository");
      console.log("Movies in local DB on startup:", MovieRepository.getAll());
      setDbReady(true);
    } catch (error) {
      console.log("Database Error:", error);
    }

  }, []);

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
          <NavigationModeContext.Provider value={{ isNavigating, setIsNavigating }}>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <RootLayoutContent
                colorScheme={colorScheme}
                isNavigating={isNavigating}
              />
              <StatusBar style="auto" />
            </ThemeProvider>
          </NavigationModeContext.Provider>
        </MapResetContext.Provider>
      </CustomThemeProvider>
    </AppContentProvider>
  );
}

function RootLayoutContent({ colorScheme, isNavigating }: { colorScheme: any, isNavigating: boolean }) {
  const { brandData, apiStatus, refreshData } = useAppContent();
  const pathname = usePathname();
  const segments = useSegments();
  const primaryColor = brandData?.brand_color_primary || "";

  // Delta check on app resume or active timers
  useEffect(() => {
    if (apiStatus !== 'ready') return;

    // 30 minute active polling sync
    const timer = setInterval(() => {
      console.log("[Sync] Triggering scheduled 30m delta check.");
      refreshData();
    }, 30 * 60 * 1000);

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
    <View style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#121212" : "#F8F9FA" }}>
      {shouldShowHeader && (
        <SafeAreaView style={{ backgroundColor: "#FFFFFF" }} edges={['top', 'left', 'right']}>
          <Navbar />
          <View style={{ backgroundColor: primaryColor }}>
            <QuickLinks />
          </View>
          <OfflineBanner />
        </SafeAreaView>
      )}
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
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="events/index"
          options={{ headerShown: false, animation: 'none' }}
        />
        <Stack.Screen
          name="events/[id]"
          options={{ headerShown: false }}
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
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="map/settings"
          options={{
            headerShown: true,
            title: "Settings",
            headerBackTitle: "back",
            headerStyle: {
              backgroundColor: primaryColor || undefined,
            },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: {
              fontFamily: "Lexend_500Medium",
            }
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
  );
}
