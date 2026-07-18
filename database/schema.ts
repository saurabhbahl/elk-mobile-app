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

    console.log("Tables created");
}

export function inspectDatabaseSchema() {
    console.log("\n=========================================");
    console.log("🔍 SQLITE DATABASE SCHEMA INSPECTION");
    console.log("=========================================");
    try {
        const tables = db.getAllSync<{ name: string; sql: string }>(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        );
        console.log(`Found ${tables.length} User Table(s):`, tables.map(t => t.name));

        tables.forEach((table) => {
            console.log(`\nTable Name: "${table.name}"`);
            console.log(`Creation SQL: ${table.sql}`);
            try {
                const columns = db.getAllSync<{
                    cid: number;
                    name: string;
                    type: string;
                    notnull: number;
                    dflt_value: any;
                    pk: number;
                }>(`PRAGMA table_info("${table.name}");`);
                
                console.log("Columns:");
                columns.forEach((col) => {
                    console.log(
                        `  - ${col.name} (${col.type || "BLOB"}) ${
                            col.pk ? "🔑 [PRIMARY KEY]" : ""
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