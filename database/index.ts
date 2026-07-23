import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

export const db: any = Platform.OS === 'web' 
    ? {
        execSync: () => {},
        runSync: () => {},
        getAllSync: () => [],
        getFirstSync: () => null,
      } as any
    : SQLite.openDatabaseSync("app.db");