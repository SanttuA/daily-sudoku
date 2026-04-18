import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { getPuzzleCatalog } from './index';
import { importCatalogFile } from './import-catalog';

describe('importCatalogFile', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it('imports a replacement catalog when the existing schedule remains compatible', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'daily-sudoku-import-'));
    temporaryDirectories.push(tempDir);

    const inputPath = path.join(tempDir, 'incoming-catalog.json');
    const outputPath = path.join(tempDir, 'catalog.json');
    const schedulePath = path.join(tempDir, 'schedule.json');
    const compatibleCatalog = getPuzzleCatalog().slice(0, 3);

    await writeFile(inputPath, `${JSON.stringify(compatibleCatalog, null, 2)}\n`, 'utf8');
    await writeFile(
      schedulePath,
      `${JSON.stringify({ '2026-01-01': 'variant-1', '2026-01-02': 'variant-2' }, null, 2)}\n`,
      'utf8',
    );

    const result = await importCatalogFile({
      inputPath,
      outputPath,
      schedulePath,
    });

    expect(result.puzzleCount).toBe(compatibleCatalog.length);
    expect(JSON.parse(await readFile(outputPath, 'utf8'))).toEqual(compatibleCatalog);
  });

  it('refuses imports that would invalidate the existing schedule', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'daily-sudoku-import-'));
    temporaryDirectories.push(tempDir);

    const inputPath = path.join(tempDir, 'incoming-catalog.json');
    const outputPath = path.join(tempDir, 'catalog.json');
    const schedulePath = path.join(tempDir, 'schedule.json');
    const incompatibleCatalog = getPuzzleCatalog()
      .slice(0, 2)
      .map((puzzle, index) => ({
        ...puzzle,
        id: `external-${index + 1}`,
      }));
    const originalOutput = JSON.stringify([{ sentinel: true }], null, 2);

    await writeFile(inputPath, `${JSON.stringify(incompatibleCatalog, null, 2)}\n`, 'utf8');
    await writeFile(outputPath, `${originalOutput}\n`, 'utf8');
    await writeFile(
      schedulePath,
      `${JSON.stringify({ '2026-01-01': 'variant-1' }, null, 2)}\n`,
      'utf8',
    );

    await expect(
      importCatalogFile({
        inputPath,
        outputPath,
        schedulePath,
      }),
    ).rejects.toThrow('Scheduled puzzle variant-1 for 2026-01-01 was not found in catalog.');

    expect(await readFile(outputPath, 'utf8')).toBe(`${originalOutput}\n`);
  });
});
