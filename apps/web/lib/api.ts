import type {
  AuthSession,
  CompleteAttemptRequest,
  CompleteAttemptResponse,
  DailyLeaderboardResponse,
  DailyPuzzleResponse,
  HistoryResponse,
} from '@daily-sudoku/contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000';

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
  const headers = {
    'Content-Type': 'application/json',
    ...init?.headers,
  };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
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
