import { describe, expect, it } from 'vitest';

import { applyEnvSource, stripWrappingQuotes } from '../lib/prisma-env';

describe('run-prisma env loading', () => {
  it('loads missing values from env files', () => {
    const env: Record<string, string | undefined> = {};

    applyEnvSource(
      [
        '# Comment',
        'DATABASE_URL="postgresql://daily_sudoku:daily_sudoku@127.0.0.1:5433/daily_sudoku?schema=public"',
        "SESSION_SECRET='test-session-secret-1234'",
      ].join('\n'),
      env,
    );

    expect(env).toMatchObject({
      DATABASE_URL:
        'postgresql://daily_sudoku:daily_sudoku@127.0.0.1:5433/daily_sudoku?schema=public',
      SESSION_SECRET: 'test-session-secret-1234',
    });
  });

  it('keeps existing environment values instead of overriding them from env files', () => {
    const env: Record<string, string | undefined> = {
      DATABASE_URL: 'postgresql://daily_sudoku:daily_sudoku@db:5432/daily_sudoku?schema=public',
      SESSION_SECRET: 'already-set-secret',
    };

    applyEnvSource(
      [
        'DATABASE_URL="postgresql://daily_sudoku:daily_sudoku@127.0.0.1:5433/daily_sudoku?schema=public"',
        'SESSION_SECRET="from-env-file"',
        'RATE_LIMIT_MAX="50"',
      ].join('\n'),
      env,
      new Set(['DATABASE_URL', 'SESSION_SECRET']),
    );

    expect(env).toMatchObject({
      DATABASE_URL: 'postgresql://daily_sudoku:daily_sudoku@db:5432/daily_sudoku?schema=public',
      SESSION_SECRET: 'already-set-secret',
      RATE_LIMIT_MAX: '50',
    });
  });

  it('allows later env files to override earlier loaded values when the key was not in the original environment', () => {
    const env: Record<string, string | undefined> = {};
    const protectedKeys = new Set<string>();

    applyEnvSource(
      'DATABASE_URL="postgresql://daily_sudoku:daily_sudoku@127.0.0.1:5433/daily_sudoku?schema=public"',
      env,
      protectedKeys,
    );
    applyEnvSource(
      'DATABASE_URL="postgresql://daily_sudoku:daily_sudoku@db:5432/daily_sudoku?schema=public"',
      env,
      protectedKeys,
    );

    expect(env).toMatchObject({
      DATABASE_URL: 'postgresql://daily_sudoku:daily_sudoku@db:5432/daily_sudoku?schema=public',
    });
  });

  it('strips matching wrapping quotes only', () => {
    expect(stripWrappingQuotes('"quoted"')).toBe('quoted');
    expect(stripWrappingQuotes("'quoted'")).toBe('quoted');
    expect(stripWrappingQuotes('"mismatched\'')).toBe('"mismatched\'');
  });
});
