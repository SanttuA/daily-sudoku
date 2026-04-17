import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { DailyLeaderboardResponse, DailyPuzzleResponse } from '@daily-sudoku/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDailyLeaderboard, mockGetDailyPuzzle, mockSubmitCompletion, mockUseAuth } =
  vi.hoisted(() => ({
    mockGetDailyLeaderboard: vi.fn(),
    mockGetDailyPuzzle: vi.fn(),
    mockSubmitCompletion: vi.fn(),
    mockUseAuth: vi.fn(),
  }));

vi.mock('../components/auth-provider', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();

  return {
    ...actual,
    getDailyLeaderboard: mockGetDailyLeaderboard,
    getDailyPuzzle: mockGetDailyPuzzle,
    submitCompletion: mockSubmitCompletion,
  };
});

import { DailySudokuExperience } from '../components/daily-sudoku-experience';

const givens = '091340678348062910705918034526407189180529407079680523637094850804176092912803746';
const firstEditableIndex = givens.indexOf('0');
const puzzleDate = '2026-04-17';
const storageKey = `daily-sudoku/progress/${puzzleDate}`;

const puzzleResponse: DailyPuzzleResponse = {
  puzzle: {
    puzzleDate,
    puzzleId: 'variant-7',
    difficulty: 'medium',
    editableCellCount: givens.split('').filter((value) => value === '0').length,
    givens,
  },
};

const leaderboardResponse: DailyLeaderboardResponse = {
  puzzleDate,
  entries: [],
  currentUserEntry: null,
};

function createBoardWithFirstMove(value: string): string {
  return `${givens.slice(0, firstEditableIndex)}${value}${givens.slice(firstEditableIndex + 1)}`;
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function renderExperience(): Promise<void> {
  render(<DailySudokuExperience />);

  await act(async () => {
    await flushAsyncWork();
  });
}

describe('DailySudokuExperience', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));
    window.localStorage.clear();

    mockGetDailyLeaderboard.mockReset();
    mockGetDailyPuzzle.mockReset();
    mockSubmitCompletion.mockReset();
    mockUseAuth.mockReset();

    mockGetDailyPuzzle.mockResolvedValue(puzzleResponse);
    mockGetDailyLeaderboard.mockResolvedValue(leaderboardResponse);
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the timer at 00:00 until the first editable move', async () => {
    await renderExperience();

    expect(screen.getByTestId('sudoku-board')).toBeInTheDocument();
    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:00');

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:00');

    fireEvent.change(screen.getByTestId(`cell-${firstEditableIndex}`), {
      target: { value: '2' },
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:02');
  });

  it('restores in-progress local progress and resumes the timer', async () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        puzzleDate,
        board: createBoardWithFirstMove('2'),
        startedAt: '2026-04-17T11:59:55.000Z',
      }),
    );

    await renderExperience();

    expect(screen.getByTestId(`cell-${firstEditableIndex}`)).toHaveValue('2');
    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:05');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:07');
  });

  it('drops legacy start times when the restored board is still untouched', async () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        puzzleDate,
        board: givens,
        startedAt: '2026-04-17T11:59:55.000Z',
      }),
    );

    await renderExperience();

    expect(screen.getByTestId(`cell-${firstEditableIndex}`)).toHaveValue('');
    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:00');
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:00');
  });

  it('resets the board back to an idle timer and clears stored progress', async () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        puzzleDate,
        board: createBoardWithFirstMove('2'),
        startedAt: '2026-04-17T11:59:54.000Z',
      }),
    );

    await renderExperience();

    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:06');

    fireEvent.click(screen.getByRole('button', { name: 'Reset board' }));

    expect(screen.getByTestId(`cell-${firstEditableIndex}`)).toHaveValue('');
    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:00');
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:00');
  });
});
