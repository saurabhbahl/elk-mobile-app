import { BaseRepository } from './BaseRepository';
import { helperExtractImage, helperExtractLink, helperExtractPoiId } from './utils';

export class RentalRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('rentals');
  }

  upsert(rent: any) {
    const id = rent.id;
    const rental_name = rent.rental_name || null;
    const featured_image_url = helperExtractImage(rent.featured_image);
    const short_description = rent.short_description || null;
    const full_description = rent.full_description || null;
    const capacity = rent.capacity || null;
    const rental_type = rent.rental_type || null;
    const availability_notes = rent.availability_notes || null;
    const pricing_notes = rent.pricing_notes || null;
    const link1 = helperExtractLink(rent.cta_1_link);
    const link2 = helperExtractLink(rent.cta_2_link);
    const map_poi_link_id = helperExtractPoiId(rent.map_poi_link);
    const active = rent.active !== false ? 1 : 0;
    const sort_order = rent.sort_order !== undefined ? parseInt(rent.sort_order, 10) : 9999;

    this.execute(`
      INSERT OR REPLACE INTO rentals (id, rental_name, featured_image_url, short_description, full_description, capacity, rental_type, availability_notes, pricing_notes, cta_1_label, cta_1_link_url, cta_2_label, cta_2_link_url, map_poi_link_id, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, rental_name, featured_image_url, short_description, full_description, capacity, rental_type, availability_notes, pricing_notes, link1.title, link1.url, link2.title, link2.url, map_poi_link_id, active, sort_order]);

    this.execute(`DELETE FROM rental_gallery WHERE rental_id = ?`, [id]);
    if (rent.additional_images && Array.isArray(rent.additional_images)) {
      rent.additional_images.forEach((img: any) => {
        const url = helperExtractImage(img);
        if (url) {
          this.execute(`INSERT INTO rental_gallery (rental_id, image_url) VALUES (?, ?)`, [id, url]);
        }
      });
    }
  }

  delete(id: string) {
    this.execute('DELETE FROM rentals WHERE id = ?', [id]);
    this.execute('DELETE FROM rental_gallery WHERE rental_id = ?', [id]);
  }

  getAll(): any[] {
    const list: any[] = [];
    const rows = this.query<any>('SELECT * FROM rentals');
    rows.forEach(row => {
      const galleries = this.query<{ image_url: string }>('SELECT image_url FROM rental_gallery WHERE rental_id = ?', [row.id]);
      list.push({
        id: row.id,
        rental_name: row.rental_name,
        featured_image: row.featured_image_url ? { url: row.featured_image_url } : null,
        additional_images: galleries.length > 0 ? galleries.map(g => ({ url: g.image_url })) : null,
        short_description: row.short_description,
        full_description: row.full_description,
        capacity: row.capacity,
        rental_type: row.rental_type,
        availability_notes: row.availability_notes,
        pricing_notes: row.pricing_notes,
        cta_1_link: row.cta_1_link_url ? { title: row.cta_1_label, url: row.cta_1_link_url } : null,
        cta_2_link: row.cta_2_link_url ? { title: row.cta_2_label, url: row.cta_2_link_url } : null,
        map_poi_link: row.map_poi_link_id ? [{ ID: row.map_poi_link_id }] : null,
        active: row.active === 1,
        sort_order: row.sort_order !== null ? String(row.sort_order) : undefined
      });
    });
    return list;
  }
}
export const rentalRepository = new RentalRepository();
