import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

export const db: SQLite.SQLiteDatabase = Platform.OS === 'web' 
    ? {
        execSync: () => {},
        runSync: () => {},
        getAllSync: () => [],
        getFirstSync: () => null,
      } as unknown as SQLite.SQLiteDatabase
    : SQLite.openDatabaseSync("app.db");