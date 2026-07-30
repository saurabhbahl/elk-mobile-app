import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { safeStorage as AsyncStorage } from '../utils/asyncStorage';
import { LIGHT_COLORS, DARK_COLORS, LIGHT_FONTS, DARK_FONTS } from '../constants/theme';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  colors: typeof LIGHT_COLORS;
  fonts: typeof LIGHT_FONTS;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = '@elk_navigator_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme once on mount
  useEffect(() => {
    let isMounted = true;
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (isMounted) {
          if (savedTheme === 'light' || savedTheme === 'dark') {
            setThemeState(savedTheme);
          } else if (systemColorScheme === 'dark') {
            setThemeState('dark');
          }
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };
    loadTheme();
    return () => { isMounted = false; };
  }, []);

  const setTheme = useCallback(async (newTheme: Theme) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeState(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_KEY, newTheme).catch(() => {});
      return newTheme;
    });
  }, []);

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const fonts = theme === 'dark' ? DARK_FONTS : LIGHT_FONTS;
  const isDark = theme === 'dark';

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      theme,
      colors,
      fonts,
      isDark,
      toggleTheme,
      setTheme,
    }),
    [theme, colors, fonts, isDark, toggleTheme, setTheme]
  );

  if (!isLoaded) {
    return null; // Prevent flash of wrong theme
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
