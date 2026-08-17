import { BaseRepository } from './BaseRepository';
import { poiRepository } from './PoiRepository';
import { programRepository } from './ProgramRepository';
import { eventRepository } from './EventRepository';
import { trailRepository } from './TrailRepository';
import { rentalRepository } from './RentalRepository';
import { tipRepository } from './TipRepository';
import { cameraRepository } from './CameraRepository';
import { settingsRepository } from './SettingsRepository';

export class AppRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('sync_metadata');
  }

  /**
   * Clears all relational tables and metadata
   */
  clearAll() {
    const tables = [
      'sync_metadata', 'pois', 'poi_gallery', 'programs', 'events', 'trails',
      'rentals', 'rental_gallery', 'tips', 'cameras', 'app_branding',
      'navigation_labels', 'popup_content', 'home_screen_settings',
      'plan_your_trip_settings', 'plan_your_trip_sections', 'plan_your_trip_gallery', 'visitors_center_settings',
      'visitor_gallery', 'programs_settings', 'events_settings',
      'live_cam_settings', 'trail_settings', 'rental_settings',
      'rental_settings_gallery', 'tips_screen_settings', 'tips_settings_gallery',
      'map_settings'
    ];
    tables.forEach(table => {
      try {
        if (table === 'sync_metadata') {
          this.execute(`DELETE FROM sync_metadata WHERE key != 'db_schema_version';`);
        } else {
          this.execute(`DELETE FROM ${table};`);
        }
      } catch (e) {
        console.warn(`Failed to clear table ${table}:`, e);
      }
    });
  }

  /**
   * Sync Metadata keys
   */
  upsertMetadata(key: string, value: string) {
    this.execute(
      `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  getMetadata(key: string): string | null {
    try {
      const results = this.query<{ value: string }>('SELECT value FROM sync_metadata WHERE key = ?', [key]);
      return results.length > 0 ? results[0].value : null;
    } catch {
      return null;
    }
  }

  /**
   * Compatibility wrapper method: Routes incoming upsertRecord calls to the exact sub-repositories
   */
  upsertRecord(id: string, type: string, jsonData: string, lastModified: string) {
    try {
      const data = JSON.parse(jsonData);
      data.id = data.id || id;
      data.updated_at = data.updated_at || lastModified;

      switch (type) {
        case 'pois':
          poiRepository.upsert(data);
          break;
        case 'programs':
          programRepository.upsert(data);
          break;
        case 'events':
          eventRepository.upsert(data);
          break;
        case 'trails':
          trailRepository.upsert(data);
          break;
        case 'rentals':
          rentalRepository.upsert(data);
          break;
        case 'tips':
          tipRepository.upsert(data);
          break;
        case 'cameras':
          cameraRepository.upsert(data);
          break;
      }
    } catch (e) {
      console.error(`Failed to route relational upsert record of type ${type}:`, e);
    }
  }

  deleteRecord(id: string, type: string) {
    switch (type) {
      case 'pois':
        poiRepository.delete(id);
        break;
      case 'programs':
        programRepository.delete(id);
        break;
      case 'events':
        eventRepository.delete(id);
        break;
      case 'trails':
        trailRepository.delete(id);
        break;
      case 'rentals':
        rentalRepository.delete(id);
        break;
      case 'tips':
        tipRepository.delete(id);
        break;
      case 'cameras':
        cameraRepository.delete(id);
        break;
    }
  }

  upsertSetting(key: string, jsonData: string) {
    try {
      const data = JSON.parse(jsonData);
      switch (key) {
        case 'app_branding':
          settingsRepository.upsertAppBranding(data);
          break;
        case 'popup_content':
          settingsRepository.upsertPopupContent(data);
          break;
        case 'navigation':
          settingsRepository.upsertNavigationLabels(data);
          break;
        case 'home_screen':
          settingsRepository.upsertHomeScreenSettings(data);
          break;
        case 'plan_your_trip':
          settingsRepository.upsertPlanYourTripSettings(data);
          break;
        case 'visitors':
          settingsRepository.upsertVisitorsCenterSettings(data);
          break;
        case 'programs_setting':
          settingsRepository.upsertProgramsSettings(data);
          break;
        case 'event_settings':
          settingsRepository.upsertEventsSettings(data);
          break;
        case 'live_cam_settings':
          settingsRepository.upsertLiveCamSettings(data);
          break;
        case 'trail_settings':
          settingsRepository.upsertTrailSettings(data);
          break;
        case 'rental_settings':
          settingsRepository.upsertRentalSettings(data);
          break;
        case 'tips_screen_settings':
          settingsRepository.upsertTipsScreenSettings(data);
          break;
        case 'map_settings':
          settingsRepository.upsertMapSettings(data);
          break;
      }
    } catch (e) {
      console.error(`Failed to route relational upsert setting ${key}:`, e);
    }
  }

  /**
   * Global Mapping/Reconstruction for all Records
   */
  getAllRecords(): Record<string, unknown[]> {
    return {
      pois: poiRepository.getAll(),
      programs: programRepository.getAll(),
      events: eventRepository.getAll(),
      trails: trailRepository.getAll(),
      rentals: rentalRepository.getAll(),
      tips: tipRepository.getAll(),
      cameras: cameraRepository.getAll()
    };
  }

  /**
   * Global Mapping/Reconstruction for all Options Settings Pages
   */
  getAllSettings(): Record<string, unknown> {
    return settingsRepository.getAllSettings();
  }
}

export const appRepository = new AppRepository();
