import * as SQLite from "expo-sqlite";

export function createCamerasTable(db: SQLite.SQLiteDatabase) {
  db.execSync(`
  CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY,
    camera_name TEXT,
    stream_url TEXT,
    stream_type TEXT,
    thumbnail_url TEXT,
    description TEXT,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 9999
  );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_cameras_active ON cameras(active);`);
}
