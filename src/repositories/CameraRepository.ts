import { BaseRepository } from './BaseRepository';
import { helperExtractImage, safeParseInt, capitalizeFirstLetter } from './utils';

export class CameraRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('cameras');
  }

  upsert(cam: any) {
    const id = cam.id;
    const camera_name = capitalizeFirstLetter(cam.camera_name) || null;
    const stream_url = cam.stream_url || null;
    const stream_type = cam.stream_type || null;
    const thumbnail_url = helperExtractImage(cam.thumbnail_poster || cam.thumbnail || cam.thumbnail_image || cam.thumbnail_url);
    const description = cam.description || null;
    const active = cam.active !== false ? 1 : 0;
    const sort_order = safeParseInt(cam.sort_order, 9999);

    this.execute(`
      INSERT OR REPLACE INTO cameras (id, camera_name, stream_url, stream_type, thumbnail_url, description, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, camera_name, stream_url, stream_type, thumbnail_url, description, active, sort_order]);
  }

  delete(id: string) {
    this.execute('DELETE FROM cameras WHERE id = ?', [id]);
  }

  getAll(): any[] {
    const list: any[] = [];
    const rows = this.query<any>('SELECT * FROM cameras');
    rows.forEach(row => {
      list.push({
        id: row.id,
        camera_name: capitalizeFirstLetter(row.camera_name),
        stream_url: row.stream_url,
        stream_type: row.stream_type,
        thumbnail_poster: row.thumbnail_url ? { url: row.thumbnail_url } : null,
        description: row.description,
        active: row.active === 1,
        sort_order: row.sort_order !== null ? String(row.sort_order) : undefined
      });
    });
    return list;
  }
}
export const cameraRepository = new CameraRepository();
