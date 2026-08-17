/**
 * SQLite database for offline route storage.
 * Integrated with central app.db database.
 *
 * Schema:
 *   routes(id INTEGER PRIMARY KEY, from_id INTEGER, to_id INTEGER, encoded_polyline TEXT, duration REAL, distance REAL)
 */
import { db } from '../database/index';

export async function getDatabase() {
  return db;
}

export async function saveRoute(
  fromId: number,
  toId: number,
  polyline: string,
  duration = 0,
  distance = 0,
  fromCoord = "",
  toCoord = ""
): Promise<void> {
  db.runSync(
    `INSERT OR REPLACE INTO routes (from_id, to_id, encoded_polyline, duration, distance, from_coord, to_coord) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [fromId, toId, polyline, duration, distance, fromCoord, toCoord]
  );
}

export async function getRoute(
  fromId: number,
  toId: number
): Promise<{ polyline: string; duration: number; distance: number } | null> {
  const row = db.getFirstSync<{ encoded_polyline: string; duration: number; distance: number }>(
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

export async function hasRoute(
  fromId: number,
  toId: number,
  fromCoord = "",
  toCoord = ""
): Promise<boolean> {
  if (fromCoord && toCoord) {
    const row = db.getFirstSync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM routes WHERE from_id = ? AND to_id = ? AND from_coord = ? AND to_coord = ?`,
      [fromId, toId, fromCoord, toCoord]
    );
    return (row?.cnt ?? 0) > 0;
  }

  const row = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM routes WHERE from_id = ? AND to_id = ?`,
    [fromId, toId]
  );
  return (row?.cnt ?? 0) > 0;
}

export async function getAllCachedRoutes(): Promise<{ from_id: number; to_id: number; duration: number; distance: number }[]> {
  return db.getAllSync<{ from_id: number; to_id: number; duration: number; distance: number }>(
    `SELECT from_id, to_id, duration, distance FROM routes`
  );
}

export async function clearAllRoutes(): Promise<void> {
  db.runSync(`DELETE FROM routes`);
}
