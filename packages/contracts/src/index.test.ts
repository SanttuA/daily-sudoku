import { describe, expect, it } from 'vitest';

import {
  authSessionSchema,
  completeAttemptRequestSchema,
  dailyLeaderboardResponseSchema,
  dailyPuzzleResponseSchema,
  signupRequestSchema,
} from './index';

describe('contracts', () => {
  it('accepts valid signup payloads', () => {
    const payload = signupRequestSchema.parse({
      email: 'player@example.com',
      displayName: 'Daily Solver',
      password: 'super-secret',
    });

    expect(payload.displayName).toBe('Daily Solver');
  });

  it('rejects malformed Sudoku boards', () => {
    expect(() =>
      completeAttemptRequestSchema.parse({
        puzzleDate: '2026-04-16',
        elapsedSeconds: 120,
        finalGrid: '123',
      }),
    ).toThrowError();
  });

  it('parses daily puzzle responses', () => {
    const response = dailyPuzzleResponseSchema.parse({
      puzzle: {
        puzzleDate: '2026-04-16',
        puzzleId: 'variant-1',
        difficulty: 'easy',
        givens: '034670912672095340108342067859701423420853701013920856961037280207419035345206179',
        editableCellCount: 16,
      },
    });

    expect(response.puzzle.puzzleId).toBe('variant-1');
  });

  it('parses leaderboard responses with a current player entry', () => {
    const response = dailyLeaderboardResponseSchema.parse({
      puzzleDate: '2026-04-16',
      entries: [
        {
          rank: 1,
          userId: 'user_1',
          displayName: 'Daily Solver',
          puzzleDate: '2026-04-16',
          puzzleId: 'variant-1',
          elapsedSeconds: 120,
          completedAt: '2026-04-16T08:00:00.000Z',
        },
      ],
      currentUserEntry: {
        rank: 1,
        userId: 'user_1',
        displayName: 'Daily Solver',
        puzzleDate: '2026-04-16',
        puzzleId: 'variant-1',
        elapsedSeconds: 120,
        completedAt: '2026-04-16T08:00:00.000Z',
      },
    });

    expect(response.entries).toHaveLength(1);
  });

  it('supports signed-out sessions', () => {
    const session = authSessionSchema.parse({ user: null });

    expect(session.user).toBeNull();
  });
});
