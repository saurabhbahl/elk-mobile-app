import { BaseRepository } from './BaseRepository';
import { helperExtractImage, helperExtractLink, safeParseInt, capitalizeFirstLetter } from './utils';

export class PoiRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('pois');
  }

  upsert(poi: any) {
    const id = poi.id;
    const poi_name = capitalizeFirstLetter(poi.poi_name) || null;
    const pin_popup_summary = poi.pin_popup_summary || null;
    const full_description = poi.full_description || null;
    const latitude = poi.latitude !== undefined && !isNaN(parseFloat(poi.latitude)) ? parseFloat(poi.latitude) : null;
    const longitude = poi.longitude !== undefined && !isNaN(parseFloat(poi.longitude)) ? parseFloat(poi.longitude) : null;
    const featured_image_url = helperExtractImage(poi.featured_image);
    const address = poi.address || null;
    const handicap_accessible = poi.handicap_accessible ? 1 : 0;
    const open_year_round = poi.open_year_round ? 1 : 0;
    const seasonal_notes = poi.seasonal_notes || null;
    const external_link = helperExtractLink(poi.external_link).url;
    const pin_icon_override = helperExtractImage(poi.pin_icon_override);
    const active = poi.active !== false ? 1 : 0;
    const sort_order = safeParseInt(poi.sort_order, 9999);

    this.execute(`
      INSERT OR REPLACE INTO pois (id, poi_name, pin_popup_summary, full_description, latitude, longitude, featured_image_url, address, handicap_accessible, open_year_round, seasonal_notes, external_link, pin_icon_override, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, poi_name, pin_popup_summary, full_description, latitude, longitude, featured_image_url, address, handicap_accessible, open_year_round, seasonal_notes, external_link, pin_icon_override, active, sort_order]);

    this.execute(`DELETE FROM poi_gallery WHERE poi_id = ?`, [id]);
    if (poi.image_gallery && Array.isArray(poi.image_gallery)) {
      poi.image_gallery.forEach((img: any) => {
        const url = helperExtractImage(img);
        if (url) {
          this.execute(`INSERT INTO poi_gallery (poi_id, image_url) VALUES (?, ?)`, [id, url]);
        }
      });
    }
  }

  delete(id: string) {
    this.execute('DELETE FROM pois WHERE id = ?', [id]);
    this.execute('DELETE FROM poi_gallery WHERE poi_id = ?', [id]);
  }

  getAll(): any[] {
    const list: any[] = [];
    const rows = this.query<any>('SELECT * FROM pois');
    rows.forEach(row => {
      const galleries = this.query<{ image_url: string }>('SELECT image_url FROM poi_gallery WHERE poi_id = ?', [row.id]);
      list.push({
        id: row.id,
        poi_name: capitalizeFirstLetter(row.poi_name),
        pin_popup_summary: row.pin_popup_summary,
        full_description: row.full_description,
        latitude: row.latitude !== null ? String(row.latitude) : null,
        longitude: row.longitude !== null ? String(row.longitude) : null,
        featured_image: row.featured_image_url ? { url: row.featured_image_url } : null,
        image_gallery: galleries.length > 0 ? galleries.map(g => ({ url: g.image_url })) : false,
        address: row.address,
        handicap_accessible: row.handicap_accessible === 1,
        open_year_round: row.open_year_round === 1,
        seasonal_notes: row.seasonal_notes,
        external_link: row.external_link,
        pin_icon_override: row.pin_icon_override ? { url: row.pin_icon_override } : null,
        active: row.active === 1,
        sort_order: row.sort_order !== null ? String(row.sort_order) : undefined
      });
    });
    return list;
  }
}
export const poiRepository = new PoiRepository();
