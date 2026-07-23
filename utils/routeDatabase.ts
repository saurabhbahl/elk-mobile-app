/**
 * SQLite database for offline route storage.
 *
 * Schema:
 *   routes(id INTEGER PRIMARY KEY, from_id INTEGER, to_id INTEGER, encoded_polyline TEXT, duration REAL, distance REAL)
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'elk_routes.db';
let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id INTEGER NOT NULL,
      to_id INTEGER NOT NULL,
      encoded_polyline TEXT NOT NULL,
      duration REAL DEFAULT 0,
      distance REAL DEFAULT 0,
      UNIQUE(from_id, to_id)
    );
  `);
  // Migration for existing databases that lack duration/distance columns
  try { await db.execAsync('ALTER TABLE routes ADD COLUMN duration REAL DEFAULT 0'); } catch {}
  try { await db.execAsync('ALTER TABLE routes ADD COLUMN distance REAL DEFAULT 0'); } catch {}
  return db;
}

export async function saveRoute(fromId: number, toId: number, polyline: string, duration = 0, distance = 0): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO routes (from_id, to_id, encoded_polyline, duration, distance) VALUES (?, ?, ?, ?, ?)`,
    [fromId, toId, polyline, duration, distance]
  );
}

export async function getRoute(fromId: number, toId: number): Promise<{ polyline: string; duration: number; distance: number } | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ encoded_polyline: string; duration: number; distance: number }>(
    `SELECT encoded_polyline, duration, distance FROM routes WHERE from_id = ? AND to_id = ?`,
    [fromId, toId]
  );
  if (!row) return null;
  return {
    polyline: row.encoded_polyline,
    duration: row.duration,
    distance: row.distance,
  };
}

export async function hasRoute(fromId: number, toId: number): Promise<boolean> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM routes WHERE from_id = ? AND to_id = ?`,
    [fromId, toId]
  );
  return (row?.cnt ?? 0) > 0;
}

export async function getAllCachedRoutes(): Promise<{ from_id: number; to_id: number; duration: number; distance: number }[]> {
  const database = await getDatabase();
  return database.getAllAsync<{ from_id: number; to_id: number; duration: number; distance: number }>(
    `SELECT from_id, to_id, duration, distance FROM routes`
  );
}

export async function clearAllRoutes(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM routes`);
}
