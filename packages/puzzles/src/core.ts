export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export type CatalogPuzzle = {
  id: string;
  difficulty: PuzzleDifficulty;
  givens: string;
  solution: string;
};

export type PuzzleSchedule = Record<string, string>;

export const puzzleEpochDate = '2026-01-01';

export function normalizeUtcDate(input: Date | string = new Date()): string {
  if (typeof input === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      throw new Error(`Invalid UTC date string: ${input}`);
    }

    const parsed = new Date(`${input}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input) {
      throw new Error(`Invalid UTC calendar date: ${input}`);
    }

    return input;
  }

  return input.toISOString().slice(0, 10);
}

export function addUtcDays(input: Date | string, days: number): string {
  if (!Number.isInteger(days)) {
    throw new Error(`Expected an integer day offset, received ${days}.`);
  }

  const normalizedDate = normalizeUtcDate(input);
  const date = new Date(`${normalizedDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return normalizeUtcDate(date);
}

export function differenceInDays(startDate: Date | string, endDate: Date | string): number {
  const normalizedStart = normalizeUtcDate(startDate);
  const normalizedEnd = normalizeUtcDate(endDate);
  const start = new Date(`${normalizedStart}T00:00:00.000Z`);
  const end = new Date(`${normalizedEnd}T00:00:00.000Z`);

  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function countEditableCells(givens: string): number {
  return [...givens].filter((value) => value === '0').length;
}

export function getLegacyPuzzleIndexForUtcDate(
  input: Date | string,
  catalogLength: number,
): number {
  if (catalogLength <= 0) {
    throw new Error('Puzzle catalog must contain at least one puzzle.');
  }

  const utcDate = normalizeUtcDate(input);
  const daysSinceEpoch = differenceInDays(puzzleEpochDate, utcDate);

  return positiveModulo(daysSinceEpoch, catalogLength);
}

export function getLegacyPuzzleIdForUtcDate(
  input: Date | string,
  catalog: Pick<CatalogPuzzle, 'id'>[],
): string {
  const index = getLegacyPuzzleIndexForUtcDate(input, catalog.length);
  const puzzle = catalog[index];

  if (!puzzle) {
    throw new Error(`No legacy puzzle found for index ${index}.`);
  }

  return puzzle.id;
}

export function buildLegacySchedule(
  catalog: Pick<CatalogPuzzle, 'id'>[],
  preserveThrough: Date | string,
  startDate: Date | string = puzzleEpochDate,
): PuzzleSchedule {
  const normalizedStart = normalizeUtcDate(startDate);
  const normalizedPreserveThrough = normalizeUtcDate(preserveThrough);
  const dayCount = differenceInDays(normalizedStart, normalizedPreserveThrough);

  if (dayCount < 0) {
    throw new Error(
      `Cannot build a legacy schedule from ${normalizedStart} through ${normalizedPreserveThrough}.`,
    );
  }

  const schedule: PuzzleSchedule = {};

  for (let offset = 0; offset <= dayCount; offset += 1) {
    const puzzleDate = addUtcDays(normalizedStart, offset);
    schedule[puzzleDate] = getLegacyPuzzleIdForUtcDate(puzzleDate, catalog);
  }

  return schedule;
}

export function getScheduledPuzzleIdForUtcDate(
  input: Date | string,
  schedule: PuzzleSchedule,
): string | null {
  const puzzleDate = normalizeUtcDate(input);

  return schedule[puzzleDate] ?? null;
}

export function getLatestScheduledDate(schedule: PuzzleSchedule): string | null {
  const dates = Object.keys(schedule).sort((left, right) => left.localeCompare(right));

  return dates.at(-1) ?? null;
}

export function splitBoard(board: string): string[][] {
  assertBoard(board, /^[0-9]{81}$/);

  return Array.from({ length: 9 }, (_, rowIndex) =>
    board.slice(rowIndex * 9, rowIndex * 9 + 9).split(''),
  );
}

export function boardFromRows(rows: string[][]): string {
  return rows.map((row) => row.join('')).join('');
}

export function matchesGivens(givens: string, candidate: string): boolean {
  assertBoard(givens, /^[0-9]{81}$/);
  assertBoard(candidate, /^[0-9]{81}$/);

  return [...givens].every((value, index) => value === '0' || value === candidate[index]);
}

export function isSolvedByRules(candidate: string): boolean {
  assertBoard(candidate, /^[1-9]{81}$/);

  const rows = splitBoard(candidate);

  for (let index = 0; index < 9; index += 1) {
    const row = rows[index];
    const column = rows.map((currentRow) => currentRow[index] ?? '');

    if (!row || !isUnitSolved(row) || !isUnitSolved(column)) {
      return false;
    }
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn += 1) {
      const box: string[] = [];

      for (let innerRow = 0; innerRow < 3; innerRow += 1) {
        for (let innerColumn = 0; innerColumn < 3; innerColumn += 1) {
          box.push(rows[boxRow * 3 + innerRow]?.[boxColumn * 3 + innerColumn] ?? '');
        }
      }

      if (!isUnitSolved(box)) {
        return false;
      }
    }
  }

  return true;
}

export function isPlayableBoardState(givens: string, candidate: string): boolean {
  if (!/^[0-9]{81}$/.test(candidate)) {
    return false;
  }

  if (!matchesGivens(givens, candidate)) {
    return false;
  }

  const rows = splitBoard(candidate);

  for (let index = 0; index < 9; index += 1) {
    const row = rows[index];
    const column = rows.map((currentRow) => currentRow[index] ?? '');

    if (!row || !isUnitValid(row) || !isUnitValid(column)) {
      return false;
    }
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn += 1) {
      const box: string[] = [];

      for (let innerRow = 0; innerRow < 3; innerRow += 1) {
        for (let innerColumn = 0; innerColumn < 3; innerColumn += 1) {
          box.push(rows[boxRow * 3 + innerRow]?.[boxColumn * 3 + innerColumn] ?? '');
        }
      }

      if (!isUnitValid(box)) {
        return false;
      }
    }
  }

  return true;
}

export function validateSubmittedSolution(
  givens: string,
  expectedSolution: string,
  candidate: string,
): boolean {
  assertBoard(expectedSolution, /^[1-9]{81}$/);
  assertBoard(candidate, /^[1-9]{81}$/);

  return (
    matchesGivens(givens, candidate) && candidate === expectedSolution && isSolvedByRules(candidate)
  );
}

export function validateCatalog(entries: CatalogPuzzle[]): CatalogPuzzle[] {
  if (entries.length === 0) {
    throw new Error('Puzzle catalog must contain at least one puzzle.');
  }

  const seenIds = new Set<string>();
  const seenGivens = new Set<string>();
  const seenSolutions = new Set<string>();

  return entries.map((entry) => {
    if (!entry.id.trim()) {
      throw new Error('Puzzle ids must be non-empty strings.');
    }

    if (!isPuzzleDifficulty(entry.difficulty)) {
      throw new Error(`Puzzle ${entry.id} has an invalid difficulty.`);
    }

    assertBoard(entry.givens, /^[0-9]{81}$/);
    assertBoard(entry.solution, /^[1-9]{81}$/);

    if (seenIds.has(entry.id)) {
      throw new Error(`Puzzle catalog contains a duplicate id: ${entry.id}`);
    }

    if (seenGivens.has(entry.givens)) {
      throw new Error(`Puzzle catalog contains duplicate givens for puzzle ${entry.id}.`);
    }

    if (seenSolutions.has(entry.solution)) {
      throw new Error(`Puzzle catalog contains duplicate solutions for puzzle ${entry.id}.`);
    }

    if (!matchesGivens(entry.givens, entry.solution)) {
      throw new Error(`Puzzle ${entry.id} does not match its solution.`);
    }

    if (!isSolvedByRules(entry.solution)) {
      throw new Error(`Puzzle ${entry.id} has an invalid solution.`);
    }

    seenIds.add(entry.id);
    seenGivens.add(entry.givens);
    seenSolutions.add(entry.solution);

    return entry;
  });
}

export function validateSchedule(
  schedule: PuzzleSchedule,
  catalog: CatalogPuzzle[],
): PuzzleSchedule {
  const catalogIds = new Set(catalog.map((entry) => entry.id));
  const validatedSchedule: PuzzleSchedule = {};

  for (const [date, puzzleId] of Object.entries(schedule).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const normalizedDate = normalizeUtcDate(date);

    if (!puzzleId.trim()) {
      throw new Error(`Scheduled puzzle id for ${normalizedDate} must be non-empty.`);
    }

    if (!catalogIds.has(puzzleId)) {
      throw new Error(
        `Scheduled puzzle ${puzzleId} for ${normalizedDate} was not found in catalog.`,
      );
    }

    validatedSchedule[normalizedDate] = puzzleId;
  }

  return validatedSchedule;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function assertBoard(value: string, pattern: RegExp): void {
  if (!pattern.test(value)) {
    throw new Error(`Invalid Sudoku board string: ${value}`);
  }
}

function isPuzzleDifficulty(value: string): value is PuzzleDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

function isUnitSolved(values: string[]): boolean {
  return [...values].sort().join('') === '123456789';
}

function isUnitValid(values: string[]): boolean {
  const seen = new Set<string>();

  for (const value of values) {
    if (value === '0') {
      continue;
    }

    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
  }

  return true;
}
