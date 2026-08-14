import * as SQLite from "expo-sqlite";

export function createPoisTable(db: SQLite.SQLiteDatabase) {
  db.execSync(`
  CREATE TABLE IF NOT EXISTS pois (
    id INTEGER PRIMARY KEY,
    poi_name TEXT,
    pin_popup_summary TEXT,
    full_description TEXT,
    latitude REAL,
    longitude REAL,
    featured_image_url TEXT,
    address TEXT,
    handicap_accessible INTEGER DEFAULT 0,
    open_year_round INTEGER DEFAULT 0,
    seasonal_notes TEXT,
    external_link TEXT,
    pin_icon_override TEXT,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 9999
  );
  `);

  db.execSync(`
  CREATE TABLE IF NOT EXISTS poi_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poi_id INTEGER,
    image_url TEXT,
    FOREIGN KEY(poi_id) REFERENCES pois(id) ON DELETE CASCADE
  );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_pois_active ON pois(active);`);
}
