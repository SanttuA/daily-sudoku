import { getPuzzleForUtcDate } from '@daily-sudoku/puzzles';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../app';
import type { AppConfig } from '../lib/config';
import { createMemoryRepository } from '../repositories/memory-repository';

const fixedDate = '2026-04-16';

function createTestConfig(): AppConfig {
  return {
    databaseUrl: 'postgresql://unused',
    port: 4000,
    host: '127.0.0.1',
    webOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000'],
    sessionSecret: 'test-session-secret-1234',
    sessionTtlDays: 30,
    rateLimitMax: 100,
    fixedUtcDate: fixedDate,
    nodeEnv: 'test',
  };
}

describe('api', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp({
      config: createTestConfig(),
      repository: createMemoryRepository(),
      now: () => new Date('2026-04-16T08:00:00.000Z'),
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('supports signup, me, and logout', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'player@example.com',
        displayName: 'Player One',
        password: 'super-secret',
      },
    });

    expect(signup.statusCode).toBe(200);
    const cookie = signup.cookies[0];
    expect(cookie?.name).toBe('daily_sudoku_session');

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: {
        daily_sudoku_session: cookie?.value ?? '',
      },
    });

    expect(me.json()).toMatchObject({
      user: {
        email: 'player@example.com',
        displayName: 'Player One',
      },
    });

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: {
        daily_sudoku_session: cookie?.value ?? '',
      },
    });

    expect(logout.statusCode).toBe(204);
  });

  it('returns the fixed daily puzzle and a leaderboard', async () => {
    const puzzleResponse = await app.inject({
      method: 'GET',
      url: '/daily-puzzle',
    });

    expect(puzzleResponse.statusCode).toBe(200);
    expect(puzzleResponse.json().puzzle.puzzleDate).toBe(fixedDate);

    const leaderboardResponse = await app.inject({
      method: 'GET',
      url: '/leaderboards/daily',
    });

    expect(leaderboardResponse.statusCode).toBe(200);
    expect(leaderboardResponse.json().entries).toHaveLength(0);
  });

  it('returns generated medium puzzles for scheduled future dates', async () => {
    const futureDate = '2026-04-19';
    const futureApp = buildApp({
      config: {
        ...createTestConfig(),
        fixedUtcDate: futureDate,
      },
      repository: createMemoryRepository(),
      now: () => new Date('2026-04-19T08:00:00.000Z'),
    });

    try {
      const response = await futureApp.inject({
        method: 'GET',
        url: '/daily-puzzle',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().puzzle).toMatchObject({
        difficulty: 'medium',
        puzzleDate: futureDate,
        puzzleId: 'generated-2026-04-19',
      });
    } finally {
      await futureApp.close();
    }
  });

  it('requires auth for official submissions', async () => {
    const puzzle = getPuzzleForUtcDate(fixedDate);

    const response = await app.inject({
      method: 'POST',
      url: '/attempts/complete',
      payload: {
        puzzleDate: fixedDate,
        elapsedSeconds: 123,
        finalGrid: puzzle.solution,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('stores the best valid score and exposes it on leaderboard and history', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'player@example.com',
        displayName: 'Player One',
        password: 'super-secret',
      },
    });
    const cookie = signup.cookies[0]?.value;
    const puzzle = getPuzzleForUtcDate(fixedDate);

    const firstAttempt = await app.inject({
      method: 'POST',
      url: '/attempts/complete',
      cookies: {
        daily_sudoku_session: cookie ?? '',
      },
      payload: {
        puzzleDate: fixedDate,
        elapsedSeconds: 240,
        finalGrid: puzzle.solution,
      },
    });

    expect(firstAttempt.statusCode).toBe(200);
    expect(firstAttempt.json().leaderboardEntry.rank).toBe(1);

    const slowerRetry = await app.inject({
      method: 'POST',
      url: '/attempts/complete',
      cookies: {
        daily_sudoku_session: cookie ?? '',
      },
      payload: {
        puzzleDate: fixedDate,
        elapsedSeconds: 360,
        finalGrid: puzzle.solution,
      },
    });

    expect(slowerRetry.statusCode).toBe(200);
    expect(slowerRetry.json().attempt.elapsedSeconds).toBe(240);

    const history = await app.inject({
      method: 'GET',
      url: '/me/history',
      cookies: {
        daily_sudoku_session: cookie ?? '',
      },
    });

    expect(history.statusCode).toBe(200);
    expect(history.json().attempts[0].elapsedSeconds).toBe(240);
  });

  it('rejects invalid solved boards', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'player@example.com',
        displayName: 'Player One',
        password: 'super-secret',
      },
    });
    const cookie = signup.cookies[0]?.value;
    const puzzle = getPuzzleForUtcDate(fixedDate);
    const invalidGrid = `1${puzzle.solution.slice(1)}`;

    const response = await app.inject({
      method: 'POST',
      url: '/attempts/complete',
      cookies: {
        daily_sudoku_session: cookie ?? '',
      },
      payload: {
        puzzleDate: fixedDate,
        elapsedSeconds: 120,
        finalGrid: invalidGrid,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
