import catalogData from '../data/catalog.json';

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export type CatalogPuzzle = {
  id: string;
  difficulty: PuzzleDifficulty;
  givens: string;
  solution: string;
};

const catalog = validateCatalog(catalogData as CatalogPuzzle[]);
const epochDate = '2026-01-01';

export function getPuzzleCatalog(): CatalogPuzzle[] {
  return catalog;
}

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

export function countEditableCells(givens: string): number {
  return [...givens].filter((value) => value === '0').length;
}

export function getPuzzleIndexForUtcDate(input: Date | string): number {
  const utcDate = normalizeUtcDate(input);
  const daysSinceEpoch = differenceInDays(epochDate, utcDate);

  return positiveModulo(daysSinceEpoch, catalog.length);
}

export function getPuzzleForUtcDate(input: Date | string) {
  const puzzleDate = normalizeUtcDate(input);
  const index = getPuzzleIndexForUtcDate(puzzleDate);
  const puzzle = catalog[index];

  if (!puzzle) {
    throw new Error(`No puzzle found for index ${index}.`);
  }

  return {
    puzzleDate,
    ...puzzle,
    editableCellCount: countEditableCells(puzzle.givens),
  };
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

function validateCatalog(entries: CatalogPuzzle[]): CatalogPuzzle[] {
  if (entries.length === 0) {
    throw new Error('Puzzle catalog must contain at least one puzzle.');
  }

  return entries.map((entry) => {
    assertBoard(entry.givens, /^[0-9]{81}$/);
    assertBoard(entry.solution, /^[1-9]{81}$/);

    if (!matchesGivens(entry.givens, entry.solution)) {
      throw new Error(`Puzzle ${entry.id} does not match its solution.`);
    }

    if (!isSolvedByRules(entry.solution)) {
      throw new Error(`Puzzle ${entry.id} has an invalid solution.`);
    }

    return entry;
  });
}

function differenceInDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function assertBoard(value: string, pattern: RegExp): void {
  if (!pattern.test(value)) {
    throw new Error(`Invalid Sudoku board string: ${value}`);
  }
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
