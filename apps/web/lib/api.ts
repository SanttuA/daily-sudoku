import type {
  AuthSession,
  CompleteAttemptRequest,
  CompleteAttemptResponse,
  DailyLeaderboardResponse,
  DailyPuzzleResponse,
  HistoryResponse,
} from '@daily-sudoku/contracts';

const defaultApiPort = '4000';
const loopbackHostnames = new Set(['127.0.0.1', '0.0.0.0', '::1', '[::1]', 'localhost']);

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function isLoopbackHostname(hostname: string): boolean {
  return loopbackHostnames.has(hostname);
}

export function resolveApiBaseUrl(
  configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
  location:
    | {
        hostname: string;
        protocol: string;
      }
    | null
    | undefined = typeof window === 'undefined' ? undefined : window.location,
): string {
  const normalizedConfiguredApiBaseUrl = configuredApiBaseUrl?.trim();

  if (!normalizedConfiguredApiBaseUrl) {
    if (!location) {
      return `http://127.0.0.1:${defaultApiPort}`;
    }

    return `${location.protocol}//${location.hostname}:${defaultApiPort}`;
  }

  if (!location) {
    return trimTrailingSlash(normalizedConfiguredApiBaseUrl);
  }

  try {
    const configuredUrl = new URL(normalizedConfiguredApiBaseUrl);

    if (
      isLoopbackHostname(configuredUrl.hostname) &&
      isLoopbackHostname(location.hostname) &&
      configuredUrl.hostname !== location.hostname
    ) {
      configuredUrl.hostname = location.hostname;
      return trimTrailingSlash(configuredUrl.toString());
    }
  } catch {
    return trimTrailingSlash(normalizedConfiguredApiBaseUrl);
  }

  return trimTrailingSlash(normalizedConfiguredApiBaseUrl);
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export async function fetchJson<TResponse>(
  path: string,
  init?: Omit<RequestInit, 'body'> & { body?: JsonValue },
): Promise<TResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const headers = new Headers(init?.headers);
  const body = init?.body === undefined ? undefined : JSON.stringify(init.body);

  if (body === undefined) {
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers,
    body,
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new ApiError(payload.error ?? 'Request failed.', response.status);
  }

  return payload as TResponse;
}

export function getDailyPuzzle(date?: string): Promise<DailyPuzzleResponse> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchJson<DailyPuzzleResponse>(`/daily-puzzle${query}`);
}

export function getDailyLeaderboard(date?: string): Promise<DailyLeaderboardResponse> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchJson<DailyLeaderboardResponse>(`/leaderboards/daily${query}`);
}

export function getSession(): Promise<AuthSession> {
  return fetchJson<AuthSession>('/auth/me');
}

export function signUp(payload: {
  email: string;
  displayName: string;
  password: string;
}): Promise<AuthSession> {
  return fetchJson<AuthSession>('/auth/signup', {
    method: 'POST',
    body: payload,
  });
}

export function logIn(payload: { email: string; password: string }): Promise<AuthSession> {
  return fetchJson<AuthSession>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export function logOut(): Promise<void> {
  return fetchJson<void>('/auth/logout', {
    method: 'POST',
  });
}

export function submitCompletion(
  payload: CompleteAttemptRequest,
): Promise<CompleteAttemptResponse> {
  return fetchJson<CompleteAttemptResponse>('/attempts/complete', {
    method: 'POST',
    body: payload,
  });
}

export function getHistory(): Promise<HistoryResponse> {
  return fetchJson<HistoryResponse>('/me/history');
}
