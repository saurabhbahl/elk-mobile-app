import * as SQLite from "expo-sqlite";

export function createProgramsTable(db: SQLite.SQLiteDatabase) {
  db.execSync(`
  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY,
    program_name TEXT,
    thumbnail_image_url TEXT,
    short_description TEXT,
    full_description TEXT,
    schedule_dates TEXT,
    location_poi_id INTEGER,
    registration_link TEXT,
    category_tags TEXT,
    featured INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 9999,
    FOREIGN KEY (location_poi_id) REFERENCES pois(id) ON DELETE SET NULL
  );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(active);`);
}
