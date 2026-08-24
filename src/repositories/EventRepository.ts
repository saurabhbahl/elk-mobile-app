import { BaseRepository } from './BaseRepository';
import { helperExtractImage, helperExtractLink, helperExtractPoiId } from './utils';

export class EventRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('events');
  }

  upsert(ev: any) {
    const id = ev.id;
    const event_name = ev.event_name || null;
    const thumbnail_image_url = helperExtractImage(ev.thumbnail_image);
    const short_description = ev.short_description || null;
    const full_description = ev.full_description || null;
    const start_date_time = ev['start_date_&_time'] || null;
    const end_date_time = ev['end_date_&_time'] || null;
    const location_name = ev.location_name || null;
    const location_address = ev.location_address || null;
    const location_poi_id = helperExtractPoiId(ev.location_poi_link);
    const registration_ticket_link = helperExtractLink(ev.registration_ticket_link).url;
    const category_tags = Array.isArray(ev.category_tag) ? ev.category_tag.join(',') : (ev.category_tag || null);
    const featured = ev.featured ? 1 : 0;
    const active = ev.active !== false ? 1 : 0;

    this.execute(`
      INSERT OR REPLACE INTO events (id, event_name, thumbnail_image_url, short_description, full_description, start_date_time, end_date_time, location_name, location_address, location_poi_id, registration_ticket_link, category_tags, featured, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, event_name, thumbnail_image_url, short_description, full_description, start_date_time, end_date_time, location_name, location_address, location_poi_id, registration_ticket_link, category_tags, featured, active]);
  }

  delete(id: string) {
    this.execute('DELETE FROM events WHERE id = ?', [id]);
  }

  getAll(): any[] {
    const list: any[] = [];
    const rows = this.query<any>('SELECT * FROM events');
    rows.forEach(row => {
      list.push({
        id: row.id,
        event_name: row.event_name,
        thumbnail_image: row.thumbnail_image_url ? { url: row.thumbnail_image_url } : null,
        short_description: row.short_description,
        full_description: row.full_description,
        'start_date_&_time': row.start_date_time,
        'end_date_&_time': row.end_date_time,
        location_name: row.location_name,
        location_address: row.location_address,
        location_poi_link: row.location_poi_id ? [{ ID: row.location_poi_id }] : null,
        registration_ticket_link: row.registration_ticket_link,
        category_tag: row.category_tags,
        featured: row.featured === 1,
        active: row.active === 1
      });
    });
    return list;
  }
}
export const eventRepository = new EventRepository();
