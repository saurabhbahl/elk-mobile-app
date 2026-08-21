import * as SQLite from "expo-sqlite";
import { db } from "./index";
import { createCamerasTable } from "./tables/cameras";
import { createEventsTable } from "./tables/events";
import { createMetadataTable } from "./tables/metadata";
import { createPoisTable } from "./tables/pois";
import { createProgramsTable } from "./tables/programs";
import { createRentalsTable } from "./tables/rentals";
import { createSettingsTables } from "./tables/settings";
import { createTipsTable } from "./tables/tips";
import { createTrailsTable } from "./tables/trails";

const CURRENT_SCHEMA_VERSION = "2";

export function createRoutesTable(database: SQLite.SQLiteDatabase) {
  database.execSync(`
  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL,
    to_id INTEGER NOT NULL,
    encoded_polyline TEXT NOT NULL,
    duration REAL DEFAULT 0,
    distance REAL DEFAULT 0,
    from_coord TEXT DEFAULT '',
    to_coord TEXT DEFAULT '',
    UNIQUE(from_id, to_id)
  );
  `);
}

export function createTables() {
  console.log("Creating tables...");

  // Drop old JSON tables if they exist to prevent schema collisions
  try {
    const legacyCheck = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name='app_records';");
    if (legacyCheck.length > 0) {
      console.log("Legacy tables detected. Dropping them and clearing sync metadata to force full sync...");
      db.execSync(`DROP TABLE IF EXISTS app_records;`);
      db.execSync(`DROP TABLE IF EXISTS app_settings;`);
      db.execSync(`DROP TABLE IF EXISTS sync_metadata;`);
    }

    // Check schema version for migrations
    const metaCheck = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_metadata';");
    if (metaCheck.length > 0) {
      const versionRow = db.getAllSync("SELECT value FROM sync_metadata WHERE key = 'db_schema_version';") as any[];
      const savedVersion = versionRow && versionRow[0] ? versionRow[0].value : null;

      if (savedVersion !== CURRENT_SCHEMA_VERSION) {
        console.log(`Schema version mismatch (current: ${CURRENT_SCHEMA_VERSION}, saved: ${savedVersion}). Wiping sync metadata...`);
        db.execSync(`DELETE FROM sync_metadata;`);
      }
    }

    // Self-healing: if critical relational tables (pois, programs, and events) are all empty,
    // and sync_metadata has data, clear it to force a fresh full sync.
    if (metaCheck.length > 0) {
      const poisTableCheck = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name='pois';");
      if (poisTableCheck.length > 0) {
        const poiCount = db.getAllSync("SELECT COUNT(*) as count FROM pois;") as any[];
        const eventCount = db.getAllSync("SELECT COUNT(*) as count FROM events;") as any[];
        const programCount = db.getAllSync("SELECT COUNT(*) as count FROM programs;") as any[];
        
        const poisEmpty = poiCount[0] && (poiCount[0] as any).count === 0;
        const eventsEmpty = eventCount[0] && (eventCount[0] as any).count === 0;
        const programsEmpty = programCount[0] && (programCount[0] as any).count === 0;

        if (poisEmpty && eventsEmpty && programsEmpty) {
          const syncDoneRow = db.getAllSync("SELECT value FROM sync_metadata WHERE key = 'initial_sync_complete';") as any[];
          const isSyncComplete = syncDoneRow && syncDoneRow[0] && syncDoneRow[0].value === 'true';
          if (!isSyncComplete) {
            console.log("Relational tables are empty and initial sync incomplete. Clearing sync metadata to force fresh full sync...");
            db.execSync(`DELETE FROM sync_metadata;`);
          }
        }
      }
    }
  } catch (e) {
    console.warn("Error performing schema migration checks:", e);
  }

  // Create tables using split modules
  createMetadataTable(db);
  createPoisTable(db);
  createProgramsTable(db);
  createEventsTable(db);
  createTrailsTable(db);
  createRentalsTable(db);
  createTipsTable(db);
  createCamerasTable(db);
  createSettingsTables(db);
  createRoutesTable(db);

  // Save current schema version
  try {
    db.execSync(`INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('db_schema_version', '${CURRENT_SCHEMA_VERSION}');`);
  } catch {}

  console.log("All relational tables created successfully.");
}

export function inspectDatabaseSchema() {
  console.log("\n=========================================");
  console.log("SQLITE DATABASE SCHEMA INSPECTION");
  console.log("=========================================");
  try {
    const tables = db.getAllSync(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    ) as any[];
    console.log(`Found ${tables.length} User Table(s):`, tables.map(t => t.name));

    tables.forEach(table => {
      console.log(`\nTable Name: "${table.name}"`);
      try {
        const columns = db.getAllSync(`PRAGMA table_info("${table.name}");`) as any[];
        console.log("Columns:");
        columns.forEach(col => {
          console.log(
            `  - ${col.name} (${col.type || "BLOB"}) ${col.pk ? " [PRIMARY KEY]" : ""}`
          );
        });
      } catch (colErr) {
        console.log(`  Failed to inspect columns for ${table.name}`);
      }
    });
  } catch (err) {
    console.log("Failed to inspect database schema:", (err as Error).message);
  }
  console.log("=========================================\n");
}