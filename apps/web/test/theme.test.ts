import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installMatchMediaMock } from './match-media';
import { THEME_STORAGE_KEY } from '../lib/theme';

const themeInitScript = readFileSync(
  path.resolve(import.meta.dirname, '../public/theme-init.js'),
  'utf8',
);

describe('theme bootstrap', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the stored preference when present', () => {
    installMatchMediaMock(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    window.eval(themeInitScript);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('falls back to the active system preference when storage is empty', () => {
    installMatchMediaMock(true);

    window.eval(themeInitScript);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('keeps the system preference when storage access throws', () => {
    installMatchMediaMock(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    window.eval(themeInitScript);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
