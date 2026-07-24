import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
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
              <Stack>
                <Stack.Screen
                  name="index"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="(home)"
                  options={{ headerShown: false }}
                />



                <Stack.Screen
                  name="programs/index"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="programs/[id]"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="events/index"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="events/[id]"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="trails/index"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="rentals/index"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="plan-trip/index"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="map/index"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="map/[id]"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="visitors/index"
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="cameras/index"
                  options={{ headerShown: false }}
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
                  options={{ headerShown: false }}
                />



                {/* Your test screen */}
                <Stack.Screen
                  name="(api)/dummy"
                  options={{
                    title: "Movies",
                  }}
                />
              </Stack>

              <StatusBar style="auto" />
            </ThemeProvider>
          </NavigationModeContext.Provider>
        </MapResetContext.Provider>
      </CustomThemeProvider>
    </AppContentProvider>
  );
}
