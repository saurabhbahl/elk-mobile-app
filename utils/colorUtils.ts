export const normalizeHex = (color: string | undefined, fallback: string): string => {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (trimmed === '' || trimmed === '#') return fallback;
  
  let hex = trimmed;
  if (!hex.startsWith('#') && !hex.startsWith('rgb') && !hex.startsWith('rgba')) {
    hex = '#' + hex;
  }
  
  if (hex.startsWith('#')) {
    // Check if it contains only valid hex characters
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    if (!hexPattern.test(hex)) {
      return fallback;
    }

    if (hex.length === 4) {
      // #abc -> #aabbcc
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    if (hex.length !== 7 && hex.length !== 9) {
      return fallback;
    }
  }
  return hex;
};

export const addOpacity = (color: string, opacityHex: string): string => {
  if (color.startsWith('#')) {
    if (color.length === 7) return color + opacityHex;
    if (color.length === 9) return color.substring(0, 7) + opacityHex;
  }
  // Fallback for non-hex colors: return without opacity to prevent crashes
  return color;
};
