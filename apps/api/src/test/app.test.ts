import { getPuzzleForUtcDate } from '@daily-sudoku/puzzles';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../app';
import type { AppConfig } from '../lib/config';
import { createMemoryRepository } from '../repositories/memory-repository';

const fixedDate = '2026-04-16';

function createTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
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
    ...overrides,
  };
}

function createTestApp(configOverrides: Partial<AppConfig> = {}) {
  return buildApp({
    config: createTestConfig(configOverrides),
    repository: createMemoryRepository(),
    now: () => new Date('2026-04-16T08:00:00.000Z'),
  });
}

describe('api', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = createTestApp();
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
        displayName: 'Player One',
      },
    });
    expect(me.json().user).not.toHaveProperty('email');
    expect(me.json().user).not.toHaveProperty('createdAt');
    expect(me.json().user).not.toHaveProperty('id');

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: {
        daily_sudoku_session: cookie?.value ?? '',
      },
    });

    expect(logout.statusCode).toBe(204);
  });

  it('returns the fixed daily puzzle and a leaderboard without internal user ids', async () => {
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

    await app.inject({
      method: 'POST',
      url: '/attempts/complete',
      cookies: {
        daily_sudoku_session: cookie ?? '',
      },
      payload: {
        puzzleDate: fixedDate,
        elapsedSeconds: 123,
        finalGrid: puzzle.solution,
      },
    });

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
    expect(leaderboardResponse.json().entries).toMatchObject([
      {
        displayName: 'Player One',
        isCurrentUser: false,
      },
    ]);
    expect(leaderboardResponse.json().entries[0]).not.toHaveProperty('userId');
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
    expect(firstAttempt.json().leaderboardEntry.isCurrentUser).toBe(true);

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

    const leaderboard = await app.inject({
      method: 'GET',
      url: '/leaderboards/daily',
      cookies: {
        daily_sudoku_session: cookie ?? '',
      },
    });

    expect(leaderboard.statusCode).toBe(200);
    expect(leaderboard.json().entries[0].isCurrentUser).toBe(true);
    expect(leaderboard.json().currentUserEntry.isCurrentUser).toBe(true);
    expect(leaderboard.json().entries[0]).not.toHaveProperty('userId');

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

  it('rejects duplicate signups without disclosing whether the email exists', async () => {
    const firstSignup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'player@example.com',
        displayName: 'Player One',
        password: 'super-secret',
      },
    });

    expect(firstSignup.statusCode).toBe(200);

    const secondSignup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'player@example.com',
        displayName: 'Player Two',
        password: 'super-secret',
      },
    });

    expect(secondSignup.statusCode).toBe(400);
    expect(secondSignup.json()).toEqual({
      error: 'Could not create account.',
    });
  });

  it('rejects credentialed writes from missing or disallowed origins outside test mode', async () => {
    const productionApp = createTestApp({
      nodeEnv: 'production',
    });

    try {
      const missingOrigin = await productionApp.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: 'player@example.com',
          displayName: 'Player One',
          password: 'super-secret',
        },
      });

      expect(missingOrigin.statusCode).toBe(403);
      expect(missingOrigin.json()).toEqual({ error: 'Origin not allowed.' });

      const disallowedOrigin = await productionApp.inject({
        method: 'POST',
        url: '/auth/signup',
        headers: {
          origin: 'https://evil.example',
        },
        payload: {
          email: 'player@example.com',
          displayName: 'Player One',
          password: 'super-secret',
        },
      });

      expect(disallowedOrigin.statusCode).toBe(403);

      const refererFallback = await productionApp.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          referer: 'http://127.0.0.1:3000/auth/login',
        },
        payload: {
          email: 'missing@example.com',
          password: 'super-secret',
        },
      });

      expect(refererFallback.statusCode).toBe(401);
      expect(refererFallback.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains',
      );
      expect(refererFallback.headers['content-security-policy']).toContain(
        "frame-ancestors 'none'",
      );
      expect(refererFallback.headers['x-content-type-options']).toBe('nosniff');
    } finally {
      await productionApp.close();
    }
  });

  it('rate limits signup and login requests by ip and normalized email', async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'PLAYER@example.com',
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'player@example.com',
        password: 'wrong-password',
      },
    });

    expect(blocked.statusCode).toBe(429);

    const differentEmail = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'other@example.com',
        password: 'wrong-password',
      },
    });

    expect(differentEmail.statusCode).toBe(401);
  });

  it('rate limits completion submissions per authenticated user id', async () => {
    const limitedApp = createTestApp({
      rateLimitMax: 2,
    });

    try {
      const firstSignup = await limitedApp.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: 'player-one@example.com',
          displayName: 'Player One',
          password: 'super-secret',
        },
      });
      const secondSignup = await limitedApp.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: 'player-two@example.com',
          displayName: 'Player Two',
          password: 'super-secret',
        },
      });
      const firstCookie = firstSignup.cookies[0]?.value;
      const secondCookie = secondSignup.cookies[0]?.value;
      const puzzle = getPuzzleForUtcDate(fixedDate);

      for (let index = 0; index < 2; index += 1) {
        const response = await limitedApp.inject({
          method: 'POST',
          url: '/attempts/complete',
          cookies: {
            daily_sudoku_session: firstCookie ?? '',
          },
          payload: {
            puzzleDate: fixedDate,
            elapsedSeconds: 120 + index,
            finalGrid: puzzle.solution,
          },
        });

        expect(response.statusCode).toBe(200);
      }

      const blocked = await limitedApp.inject({
        method: 'POST',
        url: '/attempts/complete',
        cookies: {
          daily_sudoku_session: firstCookie ?? '',
        },
        payload: {
          puzzleDate: fixedDate,
          elapsedSeconds: 140,
          finalGrid: puzzle.solution,
        },
      });

      expect(blocked.statusCode).toBe(429);

      const secondUserAllowed = await limitedApp.inject({
        method: 'POST',
        url: '/attempts/complete',
        cookies: {
          daily_sudoku_session: secondCookie ?? '',
        },
        payload: {
          puzzleDate: fixedDate,
          elapsedSeconds: 180,
          finalGrid: puzzle.solution,
        },
      });

      expect(secondUserAllowed.statusCode).toBe(200);
    } finally {
      await limitedApp.close();
    }
  });
});
