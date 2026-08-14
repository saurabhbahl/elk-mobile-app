import { db } from "./index";
import { createMetadataTable } from "./tables/metadata";
import { createPoisTable } from "./tables/pois";
import { createProgramsTable } from "./tables/programs";
import { createEventsTable } from "./tables/events";
import { createTrailsTable } from "./tables/trails";
import { createRentalsTable } from "./tables/rentals";
import { createTipsTable } from "./tables/tips";
import { createCamerasTable } from "./tables/cameras";
import { createSettingsTables } from "./tables/settings";

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

    // Self-healing: if events table exists but is empty, and sync_metadata has data, clear it to force a full sync.
    const metaCheck = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_metadata';");
    if (metaCheck.length > 0) {
      const eventsTableCheck = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name='events';");
      if (eventsTableCheck.length > 0) {
        const eventCount = db.getAllSync("SELECT COUNT(*) as count FROM events;") as any[];
        if (eventCount[0] && eventCount[0].count === 0) {
          console.log("Relational tables are empty. Clearing sync metadata to force fresh full sync...");
          db.execSync(`DELETE FROM sync_metadata;`);
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

  console.log("All relational tables created successfully.");
}

export function inspectDatabaseSchema() {
  console.log("\n=========================================");
  console.log("🔍 SQLITE DATABASE SCHEMA INSPECTION");
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
            `  - ${col.name} (${col.type || "BLOB"}) ${col.pk ? "🔑 [PRIMARY KEY]" : ""}`
          );
        });
      } catch (colErr) {
        console.log(`  Failed to inspect columns for ${table.name}`);
      }
    });
  } catch (err) {
    console.log("❌ Failed to inspect database schema:", (err as Error).message);
  }
  console.log("=========================================\n");
}