import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

const database = Platform.OS === 'web'
    ? ({
        execSync: () => {},
        runSync: () => {},
        getAllSync: () => [],
        getFirstSync: () => null,
      } as unknown as SQLite.SQLiteDatabase)
    : SQLite.openDatabaseSync("app.db");

if (Platform.OS !== 'web') {
  try {
    database.execSync("PRAGMA foreign_keys = ON;");
  } catch (e) {
    console.warn("Failed to enable PRAGMA foreign_keys:", e);
  }
}

export const db: SQLite.SQLiteDatabase = database;