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
    const trimmed = val.trim().toLowerCase();
    return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
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

/**
 * Formats trail distance string or number from 3 decimal places (0.000) or raw input to 2 decimal places (0.00).
 */
export function formatTrailDistance(dist: string | number | undefined | null): string {
  if (dist === undefined || dist === null || dist === '') return '';
  const str = String(dist).trim();
  const match = str.match(/^([0-9]+(?:\.[0-9]+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    if (!isNaN(num)) {
      return num.toFixed(2);
    }
  }
  return str;
}

