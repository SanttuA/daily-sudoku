import { describe, expect, it } from 'vitest';

import {
  countEditableCells,
  getPuzzleCatalog,
  getPuzzleForUtcDate,
  getPuzzleIndexForUtcDate,
  isPlayableBoardState,
  normalizeUtcDate,
  validateSubmittedSolution,
} from './index';

describe('puzzles', () => {
  function getFirstPuzzle() {
    const puzzle = getPuzzleCatalog()[0];

    if (!puzzle) {
      throw new Error('Expected at least one puzzle in the catalog.');
    }

    return puzzle;
  }

  it('normalizes UTC dates', () => {
    const date = normalizeUtcDate(new Date('2026-04-16T23:59:59.000Z'));

    expect(date).toBe('2026-04-16');
  });

  it('selects puzzles deterministically from a UTC date', () => {
    expect(getPuzzleIndexForUtcDate('2026-04-16')).toBe(getPuzzleIndexForUtcDate('2026-04-16'));
  });

  it('exposes editable cells for the current puzzle', () => {
    const puzzle = getPuzzleForUtcDate('2026-04-16');

    expect(countEditableCells(puzzle.givens)).toBe(puzzle.editableCellCount);
  });

  it('validates a correct solved board submission', () => {
    const puzzle = getFirstPuzzle();

    expect(validateSubmittedSolution(puzzle.givens, puzzle.solution, puzzle.solution)).toBe(true);
  });

  it('rejects invalid in-progress boards with conflicting numbers', () => {
    const puzzle = getFirstPuzzle();
    const invalidBoard = `934670912${puzzle.solution.slice(9)}`;

    expect(isPlayableBoardState(puzzle.givens, invalidBoard)).toBe(false);
  });
});
