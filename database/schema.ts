import { db } from "./index";

export function createTables() {
    console.log("Creating tables...");

    db.execSync(`
    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT,
      releaseYear TEXT
    );
    `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS app_records (
      id TEXT,
      type TEXT,
      json_data TEXT,
      last_modified TEXT,
      PRIMARY KEY (id, type)
    );
    `);

    // Migration: add last_modified to existing installs (silently ignored if column exists)
    try {
      db.execSync(`ALTER TABLE app_records ADD COLUMN last_modified TEXT;`);
    } catch (_) {
      // Column already exists — safe to ignore
    }

    db.execSync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      json_data TEXT
    );
    `);

    db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_app_records_type ON app_records(type);
    `);

    console.log("Tables created");
}

export function inspectDatabaseSchema() {
    console.log("\n=========================================");
    console.log("🔍 SQLITE DATABASE SCHEMA INSPECTION");
    console.log("=========================================");
    try {
        const tables = db.getAllSync(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        ) as any[];
        console.log(`Found ${tables.length} User Table(s):`, tables.map((t: any) => t.name));

        tables.forEach((table: any) => {
            console.log(`\nTable Name: "${table.name}"`);
            console.log(`Creation SQL: ${table.sql}`);
            try {
                const columns = db.getAllSync(`PRAGMA table_info("${table.name}");`) as any[];

                console.log("Columns:");
                columns.forEach((col: any) => {
                    console.log(
                        `  - ${col.name} (${col.type || "BLOB"}) ${col.pk ? "🔑 [PRIMARY KEY]" : ""
                        } ${col.notnull ? "⚠️ [NOT NULL]" : ""}`
                    );
                });
            } catch (colErr) {
                console.log(`  Failed to inspect columns for ${table.name}`);
            }
        });
    } catch (err: any) {
        console.log("❌ Failed to inspect database schema:", err.message);
    }
    console.log("=========================================\n");
}