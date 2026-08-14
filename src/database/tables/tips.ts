import * as SQLite from "expo-sqlite";

export function createTipsTable(db: SQLite.SQLiteDatabase) {
  db.execSync(`
  CREATE TABLE IF NOT EXISTS tips (
    id INTEGER PRIMARY KEY,
    tip_title TEXT,
    tip_body TEXT,
    tip_icon_url TEXT,
    category_tag TEXT,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 9999
  );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_tips_active ON tips(active);`);
}
