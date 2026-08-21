import { BaseRepository } from './BaseRepository';
import { helperExtractImage, helperExtractPoiId, safeParseInt } from './utils';

export class ProgramRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('programs');
  }

  upsert(prog: any) {
    const id = prog.id;
    const program_name = prog.program_name || null;
    const thumbnail_image_url = helperExtractImage(prog.thumbnail_image);
    const short_description = prog.short_description || null;
    const full_description = prog.full_description || null;
    const schedule_dates = typeof prog.schedule_dates === 'object' ? JSON.stringify(prog.schedule_dates) : (prog.schedule_dates || null);
    const location_poi_id = helperExtractPoiId(prog.location);
    const registration_link = prog.registration_link || null;
    const category_tags = Array.isArray(prog.category_tag) ? prog.category_tag.join(',') : (prog.category_tag || null);
    const featured = prog.featured ? 1 : 0;
    const active = prog.active !== false ? 1 : 0;
    const sort_order = safeParseInt(prog.sort_order, 9999);

    this.execute(`
      INSERT OR REPLACE INTO programs (id, program_name, thumbnail_image_url, short_description, full_description, schedule_dates, location_poi_id, registration_link, category_tags, featured, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, program_name, thumbnail_image_url, short_description, full_description, schedule_dates, location_poi_id, registration_link, category_tags, featured, active, sort_order]);
  }

  delete(id: string) {
    this.execute('DELETE FROM programs WHERE id = ?', [id]);
  }

  getAll(): any[] {
    const list: any[] = [];
    const rows = this.query<any>('SELECT * FROM programs');
    rows.forEach(row => {
      list.push({
        id: row.id,
        program_name: row.program_name,
        thumbnail_image: row.thumbnail_image_url ? { url: row.thumbnail_image_url } : null,
        short_description: row.short_description,
        full_description: row.full_description,
        schedule_dates: row.schedule_dates,
        location: row.location_poi_id ? [{ ID: row.location_poi_id }] : null,
        registration_link: row.registration_link,
        category_tag: row.category_tags ? row.category_tags.split(',') : null,
        featured: row.featured === 1,
        active: row.active === 1,
        sort_order: row.sort_order !== null ? String(row.sort_order) : undefined
      });
    });
    return list;
  }
}
export const programRepository = new ProgramRepository();
