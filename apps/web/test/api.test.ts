import { describe, expect, it } from 'vitest';

import { resolveApiBaseUrl } from '../lib/api';

describe('resolveApiBaseUrl', () => {
  it('uses the current browser hostname when no API base URL is configured', () => {
    expect(
      resolveApiBaseUrl(undefined, {
        hostname: 'localhost',
        protocol: 'http:',
      }),
    ).toBe('http://localhost:4000');
  });

  it('normalizes loopback hostnames to the current browser hostname', () => {
    expect(
      resolveApiBaseUrl('http://127.0.0.1:4000', {
        hostname: 'localhost',
        protocol: 'http:',
      }),
    ).toBe('http://localhost:4000');
  });

  it('keeps explicit non-loopback API URLs unchanged', () => {
    expect(
      resolveApiBaseUrl('https://api.example.com', {
        hostname: 'localhost',
        protocol: 'http:',
      }),
    ).toBe('https://api.example.com');
  });

  it('falls back to the local API default during server-side execution', () => {
    expect(resolveApiBaseUrl(undefined, null)).toBe('http://127.0.0.1:4000');
  });
});
