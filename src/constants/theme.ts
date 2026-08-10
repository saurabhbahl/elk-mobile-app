/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export const width = SCREEN_WIDTH;
export const height = SCREEN_HEIGHT;

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const LIGHT_COLORS = {
  primary: '#061b0e',
  onPrimary: '#ffffff',
  primaryContainer: '#1b3022',
  onPrimaryContainer: '#819986',
  inversePrimary: '#b4cdb8',

  secondary: '#6f5a4f',
  secondaryContainer: '#f7dacc',
  onSecondaryContainer: '#745e53',

  tertiary: '#735c00',
  tertiaryContainer: '#cba72f',
  onTertiaryContainer: '#4e3d00',

  surface: '#ffffff',
  onSurface: '#191c1c',
  surfaceVariant: '#e1e3e2',
  onSurfaceVariant: '#434843',
  surfaceContainer: '#eceeed',
  surfaceContainerHigh: '#e6e9e8',
  surfaceContainerLow: '#f2f4f3',
  surfaceContainerLowest: '#ffffff',

  outline: '#737973',
  outlineVariant: '#c3c8c1',
  background: '#f8faf9',
  error: '#ba1a1a',
  onError: '#ffffff',
};

export const DARK_COLORS = {
  primary: '#bccbba',
  onPrimary: '#273428',
  primaryContainer: '#2d3a2e',
  onPrimaryContainer: '#95a494',
  inversePrimary: '#546254',

  secondary: '#e9c176',
  secondaryContainer: '#604403',
  onSecondaryContainer: '#dab36a',

  tertiary: '#e9c176',
  tertiaryContainer: '#604403',
  onTertiaryContainer: '#dab36a',

  surface: '#111413',
  onSurface: '#e1e3e0',
  surfaceVariant: '#323534',
  onSurfaceVariant: '#c4c8c0',
  surfaceContainer: '#1d201f',
  surfaceContainerHigh: '#272b29',
  surfaceContainerLow: '#191c1b',
  surfaceContainerLowest: '#0c0f0d',

  outline: '#8e928b',
  outlineVariant: '#434843',
  background: '#111413',
  error: '#ffb4ab',
  onError: '#690005',
};

export const LIGHT_FONTS = {
  heading: 'OpenSans-Regular',
  headingSemiBold: 'OpenSans-SemiBold',
  headingBold: 'OpenSans-Bold',
  body: 'OpenSans-Regular',
  bodyMedium: 'OpenSans-SemiBold',
  bodySemiBold: 'OpenSans-SemiBold',
  bodyBold: 'OpenSans-Bold',
  caption: 'OpenSans-Regular',
};

export const DARK_FONTS = {
  heading: 'OpenSans-Regular',
  headingSemiBold: 'OpenSans-SemiBold',
  headingBold: 'OpenSans-Bold',
  body: 'OpenSans-Regular',
  bodyMedium: 'OpenSans-SemiBold',
  bodySemiBold: 'OpenSans-SemiBold',
  bodyBold: 'OpenSans-Bold',
  caption: 'OpenSans-Regular',
};

// Default exports for backwards compatibility
export const COLORS = LIGHT_COLORS;
export const FONTS = LIGHT_FONTS;

// ── Layout constants ──────────────────────────────────────────────────────────
// Height of the bottom navigation bar (used to compute scroll bottom padding)
export const NAVBAR_HEIGHT = 80;
// Extra gap so the last content item clears the navbar comfortably
export const NAVBAR_GAP = 20;
// Convenience: add this as paddingBottom on every full-page scrollable list
export const SCROLL_BOTTOM_PADDING = NAVBAR_HEIGHT + NAVBAR_GAP;
