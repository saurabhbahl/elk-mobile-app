// Helper: Safely parse integer with fallback, preventing NaN SQLite bindings
export function safeParseInt(val: any, fallback: number = 9999): number {
  if (val === undefined || val === null || val === '') return fallback;
  const parsed = parseInt(val, 10);
  return !isNaN(parsed) ? parsed : fallback;
}

// Helper: Extract image URL from string or ACF image object
export function helperExtractImage(field: any): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.url) return field.url;
  return null;
}

// Helper: Extract Link title and url from string or link object
export function helperExtractLink(field: any): { title: string | null, url: string | null } {
  if (!field) return { title: null, url: null };
  if (typeof field === 'string') return { title: null, url: field };
  return { title: field.title || null, url: field.url || null };
}

import { db } from '../database/index';

// Helper: Extract POI relation ID, ensuring referenced POI exists to satisfy SQLite foreign keys
export function helperExtractPoiId(field: any): number | null {
  if (!field) return null;
  let rawId: number | null = null;
  if (Array.isArray(field) && field.length > 0) {
    const first = field[0];
    if (typeof first === 'number') rawId = first;
    else if (typeof first === 'string') {
      const parsed = parseInt(first, 10);
      rawId = !isNaN(parsed) ? parsed : null;
    } else if (typeof first === 'object') {
      rawId = first.ID || first.id || null;
    }
  } else if (typeof field === 'number') {
    rawId = field;
  } else if (typeof field === 'string') {
    const parsed = parseInt(field, 10);
    rawId = !isNaN(parsed) ? parsed : null;
  } else if (typeof field === 'object') {
    rawId = field.ID || field.id || null;
  }

  if (rawId === null) return null;

  try {
    const check = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM pois WHERE id = ?', [rawId]);
    return (check && check.count > 0) ? rawId : null;
  } catch {
    return rawId;
  }
}
