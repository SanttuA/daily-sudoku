import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadConfigEnvFiles } from '../lib/config';

const temporaryDirectories: string[] = [];

describe('config env loading', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, {
          force: true,
          recursive: true,
        }),
      ),
    );
  });

  it('loads root env values when API startup runs from the api workspace', async () => {
    const { apiRoot, repoRoot } = await createTestRepo();
    const env: Record<string, string | undefined> = {};

    await writeFile(
      path.join(repoRoot, '.env'),
      [
        'DATABASE_URL="postgresql://daily_sudoku:daily_sudoku@127.0.0.1:5433/daily_sudoku?schema=public"',
        'SESSION_SECRET="root-session-secret"',
      ].join('\n'),
    );

    loadConfigEnvFiles(env, apiRoot);

    expect(env).toMatchObject({
      DATABASE_URL:
        'postgresql://daily_sudoku:daily_sudoku@127.0.0.1:5433/daily_sudoku?schema=public',
      SESSION_SECRET: 'root-session-secret',
    });
  });

  it('lets api env values override root env defaults when values were not externally set', async () => {
    const { apiRoot, repoRoot } = await createTestRepo();
    const env: Record<string, string | undefined> = {};

    await writeFile(path.join(repoRoot, '.env'), 'SESSION_SECRET="root-session-secret"');
    await writeFile(path.join(apiRoot, '.env'), 'SESSION_SECRET="api-session-secret"');

    loadConfigEnvFiles(env, repoRoot);

    expect(env.SESSION_SECRET).toBe('api-session-secret');
  });

  it('preserves externally supplied environment values', async () => {
    const { apiRoot, repoRoot } = await createTestRepo();
    const env: Record<string, string | undefined> = {
      SESSION_SECRET: 'already-set-secret',
    };

    await writeFile(path.join(repoRoot, '.env'), 'SESSION_SECRET="root-session-secret"');
    await writeFile(path.join(apiRoot, '.env'), 'SESSION_SECRET="api-session-secret"');

    loadConfigEnvFiles(env, repoRoot);

    expect(env.SESSION_SECRET).toBe('already-set-secret');
  });
});

async function createTestRepo(): Promise<{ apiRoot: string; repoRoot: string }> {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'daily-sudoku-config-'));
  const apiRoot = path.join(repoRoot, 'apps', 'api');

  temporaryDirectories.push(repoRoot);
  await mkdir(apiRoot, { recursive: true });

  return {
    apiRoot,
    repoRoot,
  };
}
