import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { getPuzzleCatalog, isSolvedByRules, matchesGivens } from './index';
import {
  countSolutions,
  generateCatalogFiles,
  generatePuzzleEntry,
  generatePuzzleGivens,
  generateSolvedBoard,
} from './generator';

describe('generator', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it('generates solved boards that satisfy Sudoku rules', () => {
    const solvedBoard = generateSolvedBoard('solved-board-seed');

    expect(isSolvedByRules(solvedBoard)).toBe(true);
  });

  it('builds unique-solution puzzles from solved boards', () => {
    const solvedBoard = generateSolvedBoard('givens-seed');
    const givens = generatePuzzleGivens(solvedBoard, 'givens-seed:puzzle', 38);

    if (!givens) {
      throw new Error('Expected to generate puzzle givens.');
    }

    expect(matchesGivens(givens, solvedBoard)).toBe(true);
    expect(countSolutions(givens, 2)).toBe(1);
  });

  it('avoids duplicate ids, givens, and solutions when retrying generation', () => {
    const firstPuzzle = generatePuzzleEntry({
      existingGivens: new Set(),
      existingIds: new Set(),
      existingSolutions: new Set(),
      puzzleDate: '2026-04-19',
      seed: 'duplicate-seed',
    });
    const secondPuzzle = generatePuzzleEntry({
      existingGivens: new Set([firstPuzzle.givens]),
      existingIds: new Set([firstPuzzle.id]),
      existingSolutions: new Set([firstPuzzle.solution]),
      puzzleDate: '2026-04-19',
      seed: 'duplicate-seed',
    });

    expect(secondPuzzle.id).not.toBe(firstPuzzle.id);
    expect(secondPuzzle.givens).not.toBe(firstPuzzle.givens);
    expect(secondPuzzle.solution).not.toBe(firstPuzzle.solution);
  });

  it('bootstraps the schedule from legacy assignments and appends future generated dates', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'daily-sudoku-generator-'));
    temporaryDirectories.push(tempDir);

    const catalogPath = path.join(tempDir, 'catalog.json');
    const schedulePath = path.join(tempDir, 'schedule.json');
    const fixtureCatalog = getPuzzleCatalog().slice(0, 3);

    await writeFile(catalogPath, `${JSON.stringify(fixtureCatalog, null, 2)}\n`, 'utf8');
    await writeFile(schedulePath, '{}\n', 'utf8');

    const result = await generateCatalogFiles({
      catalogPath,
      daysAhead: 2,
      preserveThrough: '2026-01-03',
      schedulePath,
      seed: 'fixture-seed',
      today: '2026-01-03',
    });
    const generatedCatalog = JSON.parse(await readFile(catalogPath, 'utf8')) as ReturnType<
      typeof getPuzzleCatalog
    >;
    const generatedSchedule = JSON.parse(await readFile(schedulePath, 'utf8')) as Record<
      string,
      string
    >;

    expect(result.createdPuzzleCount).toBe(2);
    expect(result.createdScheduleCount).toBe(5);
    expect(generatedSchedule['2026-01-01']).toBe('variant-1');
    expect(generatedSchedule['2026-01-02']).toBe('variant-2');
    expect(generatedSchedule['2026-01-03']).toBe('variant-3');
    expect(generatedSchedule['2026-01-04']).toBe('generated-2026-01-04');
    expect(generatedSchedule['2026-01-05']).toBe('generated-2026-01-05');
    expect(generatedCatalog).toHaveLength(5);
    expect(generatedCatalog[3]?.difficulty).toBe('medium');
    expect(generatedCatalog[4]?.difficulty).toBe('medium');
  });

  it('is idempotent when the requested horizon is already scheduled', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'daily-sudoku-generator-'));
    temporaryDirectories.push(tempDir);

    const catalogPath = path.join(tempDir, 'catalog.json');
    const schedulePath = path.join(tempDir, 'schedule.json');
    const fixtureCatalog = getPuzzleCatalog().slice(0, 3);

    await writeFile(catalogPath, `${JSON.stringify(fixtureCatalog, null, 2)}\n`, 'utf8');
    await writeFile(schedulePath, '{}\n', 'utf8');

    await generateCatalogFiles({
      catalogPath,
      daysAhead: 2,
      preserveThrough: '2026-01-03',
      schedulePath,
      seed: 'idempotent-seed',
      today: '2026-01-03',
    });

    const beforeSecondRunCatalog = await readFile(catalogPath, 'utf8');
    const beforeSecondRunSchedule = await readFile(schedulePath, 'utf8');
    const secondRun = await generateCatalogFiles({
      catalogPath,
      daysAhead: 2,
      preserveThrough: '2026-01-03',
      schedulePath,
      seed: 'idempotent-seed',
      today: '2026-01-03',
    });

    expect(secondRun.createdPuzzleCount).toBe(0);
    expect(secondRun.createdScheduleCount).toBe(0);
    expect(await readFile(catalogPath, 'utf8')).toBe(beforeSecondRunCatalog);
    expect(await readFile(schedulePath, 'utf8')).toBe(beforeSecondRunSchedule);
  });
});
