import { beforeEach, describe, expect, it } from 'vitest';

import { installMatchMediaMock } from './match-media';
import { THEME_STORAGE_KEY, getThemeInitScript } from '../lib/theme';

describe('theme bootstrap', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('uses the stored preference when present', () => {
    installMatchMediaMock(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    window.eval(getThemeInitScript());

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('falls back to the active system preference when storage is empty', () => {
    installMatchMediaMock(true);

    window.eval(getThemeInitScript());

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
