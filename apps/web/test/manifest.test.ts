import { describe, expect, it } from 'vitest';

import manifest from '../app/manifest';

describe('web manifest', () => {
  it('describes the installable icon pack', () => {
    expect(manifest()).toEqual({
      name: 'Daily Sudoku',
      short_name: 'Daily Sudoku',
      display: 'standalone',
      background_color: '#fff8ec',
      theme_color: '#1f1d19',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });
  });
});
