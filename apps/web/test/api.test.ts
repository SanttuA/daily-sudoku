import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logIn, logOut, resolveApiBaseUrl } from '../lib/api';

const fetchMock = vi.fn();

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

describe('fetchJson request shaping', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('omits JSON headers for body-less logout requests', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(logOut()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(url).toBe('http://localhost:4000/auth/logout');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.cache).toBe('no-store');
    expect(init.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('sends JSON headers and a stringified body for login requests', async () => {
    const payload = {
      email: 'player@example.com',
      password: 'super-secret',
    };
    const response = { user: null };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    await expect(logIn(payload)).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(url).toBe('http://localhost:4000/auth/login');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.cache).toBe('no-store');
    expect(init.body).toBe(JSON.stringify(payload));
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
