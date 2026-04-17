'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import {
  THEME_DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  applyTheme,
  getDocumentTheme,
  getSystemTheme,
  readStoredTheme,
  type Theme,
} from '../lib/theme';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme | null>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = useState<Theme>(() => {
    return getDocumentTheme() ?? getSystemTheme();
  });

  const theme = preference ?? systemTheme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_DARK_MEDIA_QUERY);

    const syncSystemTheme = (): void => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    syncSystemTheme();

    if (preference !== null) {
      return;
    }

    mediaQuery.addEventListener('change', syncSystemTheme);

    return () => mediaQuery.removeEventListener('change', syncSystemTheme);
  }, [preference]);

  function toggleTheme(): void {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setPreference(nextTheme);
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
