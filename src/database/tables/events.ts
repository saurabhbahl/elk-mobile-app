import * as SQLite from "expo-sqlite";

export function createEventsTable(db: SQLite.SQLiteDatabase) {
  db.execSync(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    event_name TEXT,
    thumbnail_image_url TEXT,
    short_description TEXT,
    full_description TEXT,
    start_date_time TEXT,
    end_date_time TEXT,
    location_name TEXT,
    location_address TEXT,
    location_poi_id INTEGER,
    registration_ticket_link TEXT,
    category_tags TEXT,
    featured INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
  );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_events_active ON events(active);`);
}
