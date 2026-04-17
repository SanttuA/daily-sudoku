import { describe, expect, it } from 'vitest';

import { metadata, viewport } from '../app/layout';

describe('layout metadata', () => {
  it('publishes the manifest and theme colors for browser chrome', () => {
    expect(metadata.manifest).toBe('/manifest.webmanifest');
    expect(viewport.themeColor).toEqual([
      { media: '(prefers-color-scheme: light)', color: '#fff8ec' },
      { media: '(prefers-color-scheme: dark)', color: '#18130f' },
    ]);
  });
});
