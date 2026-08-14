import { BaseRepository } from './BaseRepository';
import { helperExtractImage, helperExtractPoiId } from './utils';

export class TrailRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('trails');
  }

  upsert(trail: any) {
    const id = trail.id;
    const trail_name = trail.trail_name || null;
    const featured_image_url = helperExtractImage(trail.featured_image);
    const description = trail.description || null;
    const trailhead_address = trail.trailhead_address || null;
    const distance = trail.distance || null;
    const seasonal_closure = trail.seasonal_closure || null;
    const location_poi_link = helperExtractPoiId(trail.location_poi_link);
    const active = trail.active !== false ? 1 : 0;
    const sort_order = trail.sort_order !== undefined ? parseInt(trail.sort_order, 10) : 9999;

    this.execute(`
      INSERT OR REPLACE INTO trails (id, trail_name, featured_image_url, description, trailhead_address, distance, seasonal_closure, location_poi_link_id, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, trail_name, featured_image_url, description, trailhead_address, distance, seasonal_closure, location_poi_link, active, sort_order]);
  }

  delete(id: string) {
    this.execute('DELETE FROM trails WHERE id = ?', [id]);
  }

  getAll(): any[] {
    const list: any[] = [];
    const rows = this.query<any>('SELECT * FROM trails');
    rows.forEach(row => {
      list.push({
        id: row.id,
        trail_name: row.trail_name,
        featured_image: row.featured_image_url ? { url: row.featured_image_url } : null,
        description: row.description,
        trailhead_address: row.trailhead_address,
        distance: row.distance,
        seasonal_closure: row.seasonal_closure,
        location_poi_link: row.location_poi_link_id ? [{ id: row.location_poi_link_id }] : null,
        active: row.active === 1,
        sort_order: row.sort_order !== null ? String(row.sort_order) : undefined
      });
    });
    return list;
  }
}
export const trailRepository = new TrailRepository();
