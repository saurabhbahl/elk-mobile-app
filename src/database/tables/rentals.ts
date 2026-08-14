import * as SQLite from "expo-sqlite";

export function createRentalsTable(db: SQLite.SQLiteDatabase) {
  db.execSync(`
  CREATE TABLE IF NOT EXISTS rentals (
    id INTEGER PRIMARY KEY,
    rental_name TEXT,
    featured_image_url TEXT,
    short_description TEXT,
    full_description TEXT,
    capacity TEXT,
    rental_type TEXT,
    availability_notes TEXT,
    pricing_notes TEXT,
    cta_1_label TEXT,
    cta_1_link_url TEXT,
    cta_2_label TEXT,
    cta_2_link_url TEXT,
    map_poi_link_id INTEGER,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 9999
  );
  `);

  db.execSync(`
  CREATE TABLE IF NOT EXISTS rental_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rental_id INTEGER,
    image_url TEXT,
    FOREIGN KEY(rental_id) REFERENCES rentals(id) ON DELETE CASCADE
  );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_rentals_active ON rentals(active);`);
}
