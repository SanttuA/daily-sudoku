import catalogData from '../data/catalog.json';
import scheduleData from '../data/schedule.json';

import {
  CatalogPuzzle,
  countEditableCells,
  getLegacyPuzzleIndexForUtcDate,
  getScheduledPuzzleIdForUtcDate,
  isPlayableBoardState,
  matchesGivens,
  normalizeUtcDate,
  PuzzleDifficulty,
  PuzzleSchedule,
  puzzleEpochDate,
  splitBoard,
  validateCatalog,
  validateSchedule,
  validateSubmittedSolution,
  boardFromRows,
  buildLegacySchedule,
  getLatestScheduledDate,
  getLegacyPuzzleIdForUtcDate,
  addUtcDays,
  differenceInDays,
  isSolvedByRules,
} from './core';

const catalog = validateCatalog(catalogData as CatalogPuzzle[]);
const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
const schedule = validateSchedule(scheduleData as PuzzleSchedule, catalog);

export type { CatalogPuzzle, PuzzleDifficulty, PuzzleSchedule };

export {
  addUtcDays,
  boardFromRows,
  buildLegacySchedule,
  countEditableCells,
  differenceInDays,
  getLatestScheduledDate,
  getLegacyPuzzleIdForUtcDate,
  isPlayableBoardState,
  isSolvedByRules,
  matchesGivens,
  normalizeUtcDate,
  puzzleEpochDate,
  splitBoard,
  validateCatalog,
  validateSchedule,
  validateSubmittedSolution,
};

export function getPuzzleCatalog(): CatalogPuzzle[] {
  return catalog;
}

export function getPuzzleIndexForUtcDate(input: Date | string): number {
  return getLegacyPuzzleIndexForUtcDate(input, catalog.length);
}

export function getPuzzleSchedule(): PuzzleSchedule {
  return schedule;
}

export function getPuzzleForUtcDate(input: Date | string) {
  const puzzleDate = normalizeUtcDate(input);
  const scheduledPuzzleId = getScheduledPuzzleIdForUtcDate(puzzleDate, schedule);

  if (!scheduledPuzzleId) {
    throw new Error(
      `No puzzle is scheduled for ${puzzleDate}. Run npm run puzzles:generate -- --days-ahead <days>.`,
    );
  }

  const puzzle = catalogById.get(scheduledPuzzleId);

  if (!puzzle) {
    throw new Error(`Scheduled puzzle ${scheduledPuzzleId} was not found in the puzzle catalog.`);
  }

  return {
    puzzleDate,
    ...puzzle,
    editableCellCount: countEditableCells(puzzle.givens),
  };
}
