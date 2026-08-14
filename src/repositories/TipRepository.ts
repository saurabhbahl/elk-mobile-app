import { BaseRepository } from './BaseRepository';
import { helperExtractImage } from './utils';

export class TipRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('tips');
  }

  upsert(tip: any) {
    const id = tip.id;
    const tip_title = tip.tip_title || null;
    const tip_body = tip.tip_body || null;
    const tip_icon_url = helperExtractImage(tip.tip_icon_image);
    const category_tag = tip.category_tag || null;
    const active = tip.active !== false ? 1 : 0;
    const sort_order = tip.sort_order !== undefined ? parseInt(tip.sort_order, 10) : 9999;

    this.execute(`
      INSERT OR REPLACE INTO tips (id, tip_title, tip_body, tip_icon_url, category_tag, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, tip_title, tip_body, tip_icon_url, category_tag, active, sort_order]);
  }

  delete(id: string) {
    this.execute('DELETE FROM tips WHERE id = ?', [id]);
  }

  getAll(): any[] {
    const list: any[] = [];
    const rows = this.query<any>('SELECT * FROM tips');
    rows.forEach(row => {
      list.push({
        id: row.id,
        tip_title: row.tip_title,
        tip_body: row.tip_body,
        tip_icon_image: row.tip_icon_url ? { url: row.tip_icon_url } : null,
        category_tag: row.category_tag,
        active: row.active === 1,
        sort_order: row.sort_order !== null ? String(row.sort_order) : undefined
      });
    });
    return list;
  }
}
export const tipRepository = new TipRepository();
