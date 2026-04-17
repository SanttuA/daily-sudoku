'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import {
  THEME_DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  applyTheme,
  getSystemTheme,
  readStoredTheme,
  type Theme,
} from '../lib/theme';

type ThemeContextValue = {
  resolved: boolean;
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme | null>(null);
  const [systemTheme, setSystemTheme] = useState<Theme>('light');
  const [resolved, setResolved] = useState(false);

  const theme = preference ?? systemTheme;

  useEffect(() => {
    const nextPreference = readStoredTheme();

    setPreference(nextPreference);
    setSystemTheme(nextPreference ?? getSystemTheme());
    setResolved(true);
  }, []);

  useEffect(() => {
    if (!resolved) {
      return;
    }

    applyTheme(theme);
  }, [resolved, theme]);

  useEffect(() => {
    if (!resolved || preference !== null) {
      return;
    }

    const mediaQuery = window.matchMedia(THEME_DARK_MEDIA_QUERY);

    const syncSystemTheme = (): void => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    syncSystemTheme();
    mediaQuery.addEventListener('change', syncSystemTheme);

    return () => mediaQuery.removeEventListener('change', syncSystemTheme);
  }, [preference, resolved]);

  function toggleTheme(): void {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Keep the in-memory preference even when storage is unavailable.
    }

    setPreference(nextTheme);
  }

  return (
    <ThemeContext.Provider value={{ resolved, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
