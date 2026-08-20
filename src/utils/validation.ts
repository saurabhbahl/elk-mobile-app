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

/**
 * Validates stream URLs and iframe embed snippets against their configured stream type.
 * Supports YouTube, HLS (.m3u8), RTMP, and embed code / iframe snippets.
 */
export function isStreamUrlValidForType(url?: string | null, type?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 5) return false;

  const typeLower = (type || '').toLowerCase();

  // 1. YouTube stream type
  if (typeLower === 'youtube') {
    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([^&?/"']{11})/i);
    return !!ytMatch;
  }

  // 2. HLS stream type
  if (typeLower === 'hls') {
    if (trimmed.includes('<iframe') || trimmed.includes('<embed')) return false;
    if (/youtube\.com|youtu\.be/i.test(trimmed)) return false;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return /^https?:\/\/[^\s\/$.?#].[^\s]*/i.test(trimmed);
    }
    return false;
  }

  // 3. RTMP stream type
  if (typeLower === 'rtmp') {
    if (trimmed.includes('<iframe') || trimmed.includes('<embed')) return false;
    if (/youtube\.com|youtu\.be/i.test(trimmed)) return false;
    if (trimmed.startsWith('rtmp://') || trimmed.startsWith('rtmps://') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return true;
    }
    return false;
  }

  // 4. Embed code / iframe type
  if (typeLower === 'embed_code' || typeLower === 'embed') {
    if (trimmed.includes('<iframe') || trimmed.includes('<embed')) return true;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return /^https?:\/\/[^\s\/$.?#].[^\s]*/i.test(trimmed);
    }
    return false;
  }

  // General fallback check
  if (trimmed.includes('<iframe') || trimmed.includes('<embed')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return /^https?:\/\/[^\s\/$.?#].[^\s]*/i.test(trimmed);
  }

  return false;
}

export function isValidStreamUrl(url?: string | null, type?: string | null): boolean {
  return isStreamUrlValidForType(url, type);
}

