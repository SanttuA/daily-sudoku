export const THEME_STORAGE_KEY = 'daily-sudoku/theme';
export const THEME_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export type Theme = 'light' | 'dark';

export function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia(THEME_DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function getDocumentTheme(): Theme | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const documentTheme = document.documentElement.dataset.theme ?? null;

  return isTheme(documentTheme) ? documentTheme : null;
}
