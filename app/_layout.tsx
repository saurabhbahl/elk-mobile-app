import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import "react-native-reanimated";

import { createTables, inspectDatabaseSchema } from "@/database/schema";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNetInfo } from "@react-native-community/netinfo";
import { AppContentProvider } from "@/contexts/AppContentContext";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { type } = useNetInfo();

  const [dbReady, setDbReady] = useState(false);

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
  if (!dbReady) {
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
      <ThemeProvider
        value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      >
        <Stack>
          <Stack.Screen
            name="index"
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="(tabs)"
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
            name="modal"
            options={{
              presentation: "modal",
              title: "Modal",
            }}
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
    </AppContentProvider>
  );
}
