import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addUtcDays,
  buildLegacySchedule,
  CatalogPuzzle,
  countEditableCells,
  getLegacyPuzzleIdForUtcDate,
  normalizeUtcDate,
  PuzzleSchedule,
  puzzleEpochDate,
  validateCatalog,
  validateSchedule,
} from './core';

type MutablePuzzleState = {
  cells: number[];
};

export type GenerateCatalogOptions = {
  catalogPath?: string;
  schedulePath?: string;
  daysAhead: number;
  preserveThrough?: Date | string;
  seed?: string;
  today?: Date | string;
};

export type GenerateCatalogResult = {
  catalogCount: number;
  createdPuzzleCount: number;
  createdScheduleCount: number;
  preserveThrough: string;
  scheduleCount: number;
  scheduledThrough: string;
};

export type PuzzleGeneratorOptions = {
  existingGivens: Set<string>;
  existingIds: Set<string>;
  existingSolutions: Set<string>;
  puzzleDate: string;
  seed: string;
  targetClues?: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultCatalogPath = path.resolve(__dirname, '../data/catalog.json');
const defaultSchedulePath = path.resolve(__dirname, '../data/schedule.json');
const generatedDifficulty = 'medium';
const defaultSeed = 'daily-sudoku';
const defaultTargetClues = 38;
const maxGenerationAttempts = 200;
const peerIndexes = buildPeerIndexes();

export async function generateCatalogFiles(
  options: GenerateCatalogOptions,
): Promise<GenerateCatalogResult> {
  if (!Number.isInteger(options.daysAhead) || options.daysAhead < 0) {
    throw new Error('Expected --days-ahead to be an integer greater than or equal to 0.');
  }

  const today = normalizeUtcDate(options.today ?? new Date());
  const preserveThrough = normalizeUtcDate(options.preserveThrough ?? today);
  const scheduledThrough = addUtcDays(today, options.daysAhead);
  const catalogPath = options.catalogPath ?? defaultCatalogPath;
  const schedulePath = options.schedulePath ?? defaultSchedulePath;
  const seed = options.seed ?? defaultSeed;

  const catalog = validateCatalog(await readJsonFile<CatalogPuzzle[]>(catalogPath));
  const { bootstrapCount, schedule } = await loadOrBootstrapSchedule({
    catalog,
    preserveThrough,
    schedulePath,
  });

  let createdScheduleCount = bootstrapCount;
  const missingHistoricalDates = countMissingHistoricalDates(schedule, preserveThrough);

  if (missingHistoricalDates > 0) {
    fillMissingLegacyDates(schedule, catalog, preserveThrough);
    createdScheduleCount += missingHistoricalDates;
  }

  const existingIds = new Set(catalog.map((entry) => entry.id));
  const existingGivens = new Set(catalog.map((entry) => entry.givens));
  const existingSolutions = new Set(catalog.map((entry) => entry.solution));
  let createdPuzzleCount = 0;

  for (const puzzleDate of listDatesInRange(addUtcDays(preserveThrough, 1), scheduledThrough)) {
    if (schedule[puzzleDate]) {
      continue;
    }

    const puzzle = generatePuzzleEntry({
      existingGivens,
      existingIds,
      existingSolutions,
      puzzleDate,
      seed,
    });
    catalog.push(puzzle);
    schedule[puzzleDate] = puzzle.id;
    existingIds.add(puzzle.id);
    existingGivens.add(puzzle.givens);
    existingSolutions.add(puzzle.solution);
    createdPuzzleCount += 1;
    createdScheduleCount += 1;
  }

  const validatedCatalog = validateCatalog(catalog);
  const validatedSchedule = validateSchedule(schedule, validatedCatalog);

  await Promise.all([
    writeJsonFile(catalogPath, validatedCatalog),
    writeJsonFile(schedulePath, validatedSchedule),
  ]);

  return {
    catalogCount: validatedCatalog.length,
    createdPuzzleCount,
    createdScheduleCount,
    preserveThrough,
    scheduleCount: Object.keys(validatedSchedule).length,
    scheduledThrough,
  };
}

export function generatePuzzleEntry(options: PuzzleGeneratorOptions): CatalogPuzzle {
  const puzzleDate = normalizeUtcDate(options.puzzleDate);
  const targetClues = options.targetClues ?? defaultTargetClues;

  for (let attempt = 0; attempt < maxGenerationAttempts; attempt += 1) {
    const attemptSeed = `${options.seed}:${puzzleDate}:${attempt}`;
    const solution = generateSolvedBoard(attemptSeed);

    if (options.existingSolutions.has(solution)) {
      continue;
    }

    const givens = generatePuzzleGivens(solution, `${attemptSeed}:givens`, targetClues);

    if (!givens) {
      continue;
    }

    if (options.existingGivens.has(givens)) {
      continue;
    }

    const id = buildGeneratedPuzzleId(puzzleDate, options.existingIds, attempt);

    if (options.existingIds.has(id)) {
      continue;
    }

    return {
      id,
      difficulty: generatedDifficulty,
      givens,
      solution,
    };
  }

  throw new Error(`Could not generate a unique puzzle for ${puzzleDate}.`);
}

export function generateSolvedBoard(seed: string): string {
  const state: MutablePuzzleState = {
    cells: Array.from({ length: 81 }, () => 0),
  };
  const prng = createPrng(seed);

  if (!fillBoard(state, prng)) {
    throw new Error('Could not generate a solved Sudoku board.');
  }

  return stringifyCells(state.cells);
}

export function generatePuzzleGivens(
  solution: string,
  seed: string,
  targetClues = defaultTargetClues,
): string | null {
  const solutionState = createStateFromBoard(solution);

  if (targetClues <= 0 || targetClues >= 81) {
    throw new Error(`Expected target clues between 1 and 80, received ${targetClues}.`);
  }

  const prng = createPrng(seed);
  const indexes = prng.shuffle(
    Array.from({ length: solutionState.cells.length }, (_, index) => index),
  );
  let cluesRemaining = 81;

  for (const index of indexes) {
    if (cluesRemaining <= targetClues) {
      break;
    }

    const value = solutionState.cells[index];

    if (!value) {
      continue;
    }

    solutionState.cells[index] = 0;

    if (countSolutionsForState(solutionState, 2) !== 1) {
      solutionState.cells[index] = value;
      continue;
    }

    cluesRemaining -= 1;
  }

  const givens = stringifyCells(solutionState.cells);

  return countEditableCells(givens) === 81 - targetClues ? givens : null;
}

export function countSolutions(board: string, limit = 2): number {
  return countSolutionsForState(createStateFromBoard(board), limit);
}

async function loadOrBootstrapSchedule(input: {
  catalog: CatalogPuzzle[];
  preserveThrough: string;
  schedulePath: string;
}): Promise<{ bootstrapCount: number; schedule: PuzzleSchedule }> {
  const scheduleExists = await fileExists(input.schedulePath);

  if (!scheduleExists) {
    const schedule = buildLegacySchedule(input.catalog, input.preserveThrough);

    return {
      bootstrapCount: Object.keys(schedule).length,
      schedule,
    };
  }

  const loadedSchedule = validateSchedule(
    await readJsonFile<PuzzleSchedule>(input.schedulePath),
    input.catalog,
  );

  if (Object.keys(loadedSchedule).length === 0) {
    const schedule = buildLegacySchedule(input.catalog, input.preserveThrough);

    return {
      bootstrapCount: Object.keys(schedule).length,
      schedule,
    };
  }

  return {
    bootstrapCount: 0,
    schedule: loadedSchedule,
  };
}

function countMissingHistoricalDates(schedule: PuzzleSchedule, preserveThrough: string): number {
  let missingDates = 0;

  for (const puzzleDate of listDatesInRange(puzzleEpochDate, preserveThrough)) {
    if (!schedule[puzzleDate]) {
      missingDates += 1;
    }
  }

  return missingDates;
}

function fillMissingLegacyDates(
  schedule: PuzzleSchedule,
  catalog: Pick<CatalogPuzzle, 'id'>[],
  preserveThrough: string,
): void {
  for (const puzzleDate of listDatesInRange(puzzleEpochDate, preserveThrough)) {
    schedule[puzzleDate] ??= getLegacyPuzzleIdForUtcDate(puzzleDate, catalog);
  }
}

function buildGeneratedPuzzleId(
  puzzleDate: string,
  existingIds: Set<string>,
  attempt: number,
): string {
  const baseId = `generated-${puzzleDate}`;

  if (attempt === 0 && !existingIds.has(baseId)) {
    return baseId;
  }

  return `${baseId}-${attempt + 1}`;
}

function countSolutionsForState(state: MutablePuzzleState, limit: number): number {
  if (limit < 1) {
    throw new Error(`Expected a positive solution limit, received ${limit}.`);
  }

  const nextCell = findBestEmptyCell(state.cells);

  if (!nextCell) {
    return 1;
  }

  if (nextCell.candidates.length === 0) {
    return 0;
  }

  let solutionCount = 0;

  for (const candidate of nextCell.candidates) {
    state.cells[nextCell.index] = candidate;
    solutionCount += countSolutionsForState(state, limit - solutionCount);

    if (solutionCount >= limit) {
      state.cells[nextCell.index] = 0;
      return solutionCount;
    }
  }

  state.cells[nextCell.index] = 0;
  return solutionCount;
}

function fillBoard(state: MutablePuzzleState, prng: ReturnType<typeof createPrng>): boolean {
  const nextCell = findBestEmptyCell(state.cells);

  if (!nextCell) {
    return true;
  }

  if (nextCell.candidates.length === 0) {
    return false;
  }

  for (const candidate of prng.shuffle(nextCell.candidates)) {
    state.cells[nextCell.index] = candidate;

    if (fillBoard(state, prng)) {
      return true;
    }
  }

  state.cells[nextCell.index] = 0;
  return false;
}

function findBestEmptyCell(cells: number[]): { candidates: number[]; index: number } | null {
  let bestMatch: { candidates: number[]; index: number } | null = null;

  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index] !== 0) {
      continue;
    }

    const candidates = getCandidates(cells, index);

    if (candidates.length === 0) {
      return {
        candidates,
        index,
      };
    }

    if (!bestMatch || candidates.length < bestMatch.candidates.length) {
      bestMatch = {
        candidates,
        index,
      };
    }

    if (bestMatch.candidates.length === 1) {
      return bestMatch;
    }
  }

  return bestMatch;
}

function getCandidates(cells: number[], index: number): number[] {
  const used = new Set<number>();

  for (const peerIndex of peerIndexes[index] ?? []) {
    const value = cells[peerIndex];

    if (value) {
      used.add(value);
    }
  }

  const candidates: number[] = [];

  for (let value = 1; value <= 9; value += 1) {
    if (!used.has(value)) {
      candidates.push(value);
    }
  }

  return candidates;
}

function buildPeerIndexes(): number[][] {
  return Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9);
    const column = index % 9;
    const peers = new Set<number>();

    for (let currentColumn = 0; currentColumn < 9; currentColumn += 1) {
      peers.add(row * 9 + currentColumn);
    }

    for (let currentRow = 0; currentRow < 9; currentRow += 1) {
      peers.add(currentRow * 9 + column);
    }

    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColumnStart = Math.floor(column / 3) * 3;

    for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < 3; columnOffset += 1) {
        peers.add((boxRowStart + rowOffset) * 9 + boxColumnStart + columnOffset);
      }
    }

    peers.delete(index);
    return [...peers];
  });
}

function createStateFromBoard(board: string): MutablePuzzleState {
  if (!/^[0-9]{81}$/.test(board)) {
    throw new Error(`Invalid Sudoku board string: ${board}`);
  }

  return {
    cells: [...board].map((value) => Number.parseInt(value, 10)),
  };
}

function stringifyCells(cells: number[]): string {
  return cells.join('');
}

function createPrng(seed: string) {
  const nextSeed = createSeedGenerator(seed);
  let state = nextSeed();

  return {
    next() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    nextInt(max: number) {
      if (!Number.isInteger(max) || max <= 0) {
        throw new Error(`Expected a positive integer max, received ${max}.`);
      }

      return Math.floor(this.next() * max);
    },
    shuffle<T>(values: T[]): T[] {
      const shuffled = [...values];

      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = this.nextInt(index + 1);
        const currentValue = shuffled[index];
        const swapValue = shuffled[swapIndex];

        if (currentValue === undefined || swapValue === undefined) {
          throw new Error('Encountered an undefined value while shuffling.');
        }

        shuffled[index] = swapValue;
        shuffled[swapIndex] = currentValue;
      }

      return shuffled;
    },
  };
}

function createSeedGenerator(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

function listDatesInRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) {
    return [];
  }

  const dates: string[] = [];
  let currentDate = normalizeUtcDate(startDate);

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addUtcDays(currentDate, 1);
  }

  return dates;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const source = await readFile(filePath, 'utf8');
  return JSON.parse(source) as T;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
