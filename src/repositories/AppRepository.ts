import { BaseRepository } from './BaseRepository';

export class AppRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('app_records');
  }

  /**
   * Clears the entire database (Used for full resets)
   */
  clearAll() {
    this.execute('DELETE FROM app_records;');
    this.execute('DELETE FROM app_settings;');
    this.execute('DELETE FROM sync_metadata;');
  }

  /**
   * Save a single record type and update its JSON payload
   */
  upsertRecord(id: string, type: string, jsonData: string, lastModified: string) {
    this.execute(
      `INSERT OR REPLACE INTO app_records (id, type, json_data, last_modified) VALUES (?, ?, ?, ?)`,
      [id, type, jsonData, lastModified]
    );
  }

  /**
   * Save settings
   */
  upsertSetting(key: string, jsonData: string) {
    this.execute(
      `INSERT OR REPLACE INTO app_settings (key, json_data) VALUES (?, ?)`,
      [key, jsonData]
    );
  }

  /**
   * Save Sync Metadata
   */
  upsertMetadata(key: string, value: string) {
    this.execute(
      `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }
  
  getMetadata(key: string): string | null {
    try {
        const results = this.query<{value: string}>('SELECT value FROM sync_metadata WHERE key = ?', [key]);
        return results.length > 0 ? results[0].value : null;
    } catch {
        return null;
    }
  }

  getAllRecords(): Record<string, unknown[]> {
    const rawRecords = this.query<{type: string, json_data: string}>('SELECT type, json_data FROM app_records');
    const recordsMap: Record<string, unknown[]> = {};
    rawRecords.forEach(record => {
      if (!recordsMap[record.type]) {
        recordsMap[record.type] = [];
      }
      try {
        recordsMap[record.type].push(JSON.parse(record.json_data));
      } catch (e) {
        console.error('Failed to parse json_data for type', record.type);
      }
    });
    return recordsMap;
  }

  getAllSettings(): Record<string, unknown> {
    const rawSettings = this.query<{key: string, json_data: string}>('SELECT key, json_data FROM app_settings');
    const settingsMap: Record<string, unknown> = {};
    rawSettings.forEach(setting => {
      try {
        settingsMap[setting.key] = JSON.parse(setting.json_data);
      } catch (e) {
        console.error('Failed to parse json_data for setting', setting.key);
      }
    });
    return settingsMap;
  }
}

export const appRepository = new AppRepository();
