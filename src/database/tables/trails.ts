import * as SQLite from "expo-sqlite";

export function createTrailsTable(db: SQLite.SQLiteDatabase) {
  db.execSync(`
  CREATE TABLE IF NOT EXISTS trails (
    id INTEGER PRIMARY KEY,
    trail_name TEXT,
    featured_image_url TEXT,
    description TEXT,
    trailhead_address TEXT,
    distance TEXT,
    seasonal_closure TEXT,
    location_poi_link_id INTEGER,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 9999,
    FOREIGN KEY (location_poi_link_id) REFERENCES pois(id) ON DELETE SET NULL
  );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_trails_active ON trails(active);`);
}
