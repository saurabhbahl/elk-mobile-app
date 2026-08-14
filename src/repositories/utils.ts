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

// Helper: Extract POI relation ID
export function helperExtractPoiId(field: any): number | null {
  if (!field) return null;
  if (Array.isArray(field) && field.length > 0) {
    const first = field[0];
    if (typeof first === 'number') return first;
    if (typeof first === 'string') return parseInt(first, 10) || null;
    return first.ID || first.id || null;
  }
  if (typeof field === 'number') return field;
  if (typeof field === 'string') return parseInt(field, 10) || null;
  if (typeof field === 'object') return field.ID || field.id || null;
  return null;
}
