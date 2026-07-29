export const normalizeHex = (color: string | undefined | null): string | undefined => {
  if (!color || typeof color !== 'string') return undefined;
  const trimmed = color.trim();
  if (trimmed === '' || trimmed === '#') return undefined;
  
  let hex = trimmed;
  if (!hex.startsWith('#') && !hex.startsWith('rgb') && !hex.startsWith('rgba')) {
    hex = '#' + hex;
  }
  
  if (hex.startsWith('#')) {
    // Check if it contains only valid hex characters
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    if (!hexPattern.test(hex)) {
      return undefined;
    }

    if (hex.length === 4) {
      // #abc -> #aabbcc
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    if (hex.length !== 7 && hex.length !== 9) {
      return undefined;
    }
  }
  return hex;
};

export const addOpacity = (color: string | undefined, opacityHex: string): string | undefined => {
  if (!color) return undefined;
  if (color.startsWith('#')) {
    if (color.length === 7) return color + opacityHex;
    if (color.length === 9) return color.substring(0, 7) + opacityHex;
  }
  // Fallback for non-hex colors: return without opacity to prevent crashes
  return color;
};
