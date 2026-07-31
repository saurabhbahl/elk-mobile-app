/**
 * Validates whether the given ACF API data field contains valid content to be rendered.
 * If the value is null, undefined, an empty string, an empty array, or an empty object, returns false.
 */
export function isValidData(val: any): boolean {
  if (val === null || val === undefined) return false;

  if (typeof val === 'boolean') {
    return val;
  }

  if (typeof val === 'string') {
    return val.trim() !== '';
  }

  if (Array.isArray(val)) {
    return val.length > 0;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return false;

    // Special handling for image objects that have a URL key which might be empty
    if ('url' in val) {
      const urlVal = val.url;
      return urlVal !== null && urlVal !== undefined && typeof urlVal === 'string' && urlVal.trim() !== '';
    }
  }

  return true;
}
