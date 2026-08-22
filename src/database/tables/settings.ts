import * as SQLite from "expo-sqlite";

export function createSettingsTables(db: SQLite.SQLiteDatabase) {
  // App Branding
  db.execSync(`
  CREATE TABLE IF NOT EXISTS app_branding (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    app_name TEXT,
    app_tagline TEXT,
    logo_primary_url TEXT,
    logo_secondary_url TEXT,
    brand_color_primary TEXT,
    brand_color_secondary TEXT,
    splash_background_url TEXT
  );
  `);

  // Navigation Labels
  db.execSync(`
  CREATE TABLE IF NOT EXISTS navigation_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT,
    icon_key TEXT,
    nav_link_url TEXT,
    enabled INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  );
  `);

  // Popup Content
  db.execSync(`
  CREATE TABLE IF NOT EXISTS popup_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    popup_enabled INTEGER DEFAULT 0,
    popup_title TEXT,
    popup_body_copy TEXT,
    popup_image_url TEXT,
    cta_button_link TEXT,
    close_button_style TEXT
  );
  `);

  // Home Screen Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS home_screen_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hero_welcome_heading TEXT,
    hero_intro_paragraph TEXT,
    hero_cta_button_link TEXT,
    map_block_heading TEXT,
    map_view_button_label TEXT,
    programs_block_heading TEXT,
    programs_to_display INTEGER DEFAULT 4,
    event_block_heading TEXT,
    event_view_all_label TEXT,
    featured_event_id INTEGER,
    trails_block_heading TEXT,
    trail_links_to_show INTEGER DEFAULT 3,
    grant_logo_url TEXT,
    grant_details TEXT,
    map_preview_image_url TEXT
  );
  `);

  try { db.execSync(`ALTER TABLE home_screen_settings ADD COLUMN grant_logo_url TEXT;`); } catch { }
  try { db.execSync(`ALTER TABLE home_screen_settings ADD COLUMN grant_details TEXT;`); } catch { }
  try { db.execSync(`ALTER TABLE home_screen_settings ADD COLUMN map_preview_image_url TEXT;`); } catch { }

  // Plan Your Trip Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS plan_your_trip_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    hero_image_url TEXT,
    intro_paragraph TEXT
  );
  `);

  // Plan Your Trip Sections
  db.execSync(`
  CREATE TABLE IF NOT EXISTS plan_your_trip_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_heading TEXT,
    section_icon_url TEXT,
    section_body TEXT,
    section_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 9999
  );
  `);

  // Plan Your Trip Gallery
  db.execSync(`
  CREATE TABLE IF NOT EXISTS plan_your_trip_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT
  );
  `);

  // Visitors Center Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS visitors_center_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    hero_image_url TEXT,
    body_copy TEXT,
    address TEXT,
    phone_number TEXT,
    hours_of_operation TEXT,
    accessibility_notes TEXT,
    cta_1_title TEXT,
    cta_1_image_url TEXT,
    cta_1_link_title TEXT,
    cta_1_link_url TEXT,
    cta_2_title TEXT,
    cta_2_image_url TEXT,
    cta_2_link_title TEXT,
    cta_2_link_url TEXT,
    map_poi_link_id INTEGER,
    FOREIGN KEY (map_poi_link_id) REFERENCES pois(id) ON DELETE SET NULL
  );
  `);

  try { db.execSync(`ALTER TABLE visitors_center_settings ADD COLUMN cta_1_title TEXT;`); } catch { }
  try { db.execSync(`ALTER TABLE visitors_center_settings ADD COLUMN cta_2_title TEXT;`); } catch { }

  // Visitor Gallery
  db.execSync(`
  CREATE TABLE IF NOT EXISTS visitor_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT
  );
  `);

  // Programs Screen Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS programs_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    layout TEXT,
    filter_bar_enabled INTEGER DEFAULT 1
  );
  `);

  // Events Screen Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS events_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    past_events_visibility TEXT,
    filter_bar_enabled INTEGER DEFAULT 1
  );
  `);

  // Live Cam Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS live_cam_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    offline_message TEXT,
    quality_note TEXT
  );
  `);

  // Trail Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS trail_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    filter_bar_enabled INTEGER DEFAULT 1,
    default_sort TEXT
  );
  `);

  // Rental Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS rental_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    intro_text TEXT
  );
  `);

  // Rental Settings Gallery
  db.execSync(`
  CREATE TABLE IF NOT EXISTS rental_settings_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT
  );
  `);

  // Tips Screen Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS tips_screen_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    intro_paragraph TEXT,
    header_icon TEXT
  );
  `);

  // Tips Settings Gallery
  db.execSync(`
  CREATE TABLE IF NOT EXISTS tips_settings_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT
  );
  `);

  // Map Settings
  db.execSync(`
  CREATE TABLE IF NOT EXISTS map_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    screen_title TEXT,
    default_center_lat REAL,
    default_center_lng REAL,
    default_zoom_level TEXT,
    map_style TEXT
  );
  `);
}
