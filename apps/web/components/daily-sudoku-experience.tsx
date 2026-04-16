'use client';

import type { DailyLeaderboardResponse, DailyPuzzle } from '@daily-sudoku/contracts';
import { isPlayableBoardState, isSolvedByRules } from '@daily-sudoku/puzzles';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { ApiError, getDailyLeaderboard, getDailyPuzzle, submitCompletion } from '../lib/api';
import { clearProgress, loadProgress, saveProgress } from '../lib/puzzle-progress';
import { formatElapsedSeconds, formatPuzzleDateLabel } from '../lib/time';
import { useAuth } from './auth-provider';
import { LeaderboardPanel } from './leaderboard-panel';
import { SudokuBoard } from './sudoku-board';

export function DailySudokuExperience() {
  const { user, loading: authLoading } = useAuth();
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardResponse | null>(null);
  const [board, setBoard] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clockTick, setClockTick] = useState(() => Date.now());

  useEffect(() => {
    void loadPuzzle();
  }, []);

  useEffect(() => {
    if (!puzzle) {
      return;
    }

    void loadLeaderboard(puzzle.puzzleDate);
  }, [puzzle?.puzzleDate, user?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!puzzle || !startedAt) {
      return;
    }

    saveProgress({
      puzzleDate: puzzle.puzzleDate,
      board,
      startedAt,
      completedAt: completedAt ?? undefined,
    });
  }, [board, completedAt, puzzle?.puzzleDate, startedAt]);

  const solved =
    !!puzzle &&
    /^[1-9]{81}$/.test(board) &&
    isPlayableBoardState(puzzle.givens, board) &&
    isSolvedByRules(board);

  useEffect(() => {
    if (solved && !completedAt) {
      setCompletedAt(new Date().toISOString());
      setSubmitError(null);
    }
  }, [completedAt, solved]);

  const elapsedSeconds =
    startedAt === null
      ? 0
      : Math.max(
          1,
          Math.floor(
            ((completedAt ? new Date(completedAt).getTime() : clockTick) -
              new Date(startedAt).getTime()) /
              1000,
          ),
        );

  async function loadPuzzle(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await getDailyPuzzle();
      const nextPuzzle = response.puzzle;
      const storedProgress = loadProgress(nextPuzzle.puzzleDate);
      const restoredBoard =
        storedProgress && isPlayableBoardState(nextPuzzle.givens, storedProgress.board)
          ? storedProgress.board
          : nextPuzzle.givens;
      const restoredCompletion =
        storedProgress?.completedAt &&
        /^[1-9]{81}$/.test(restoredBoard) &&
        isPlayableBoardState(nextPuzzle.givens, restoredBoard) &&
        isSolvedByRules(restoredBoard)
          ? storedProgress.completedAt
          : null;

      setPuzzle(nextPuzzle);
      setBoard(restoredBoard);
      setStartedAt(storedProgress?.startedAt ?? new Date().toISOString());
      setCompletedAt(restoredCompletion);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the daily puzzle.');
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard(puzzleDate: string): Promise<void> {
    try {
      const response = await getDailyLeaderboard(puzzleDate);
      setLeaderboard(response);
    } catch {
      setLeaderboard(null);
    }
  }

  function updateBoard(index: number, nextValue: string): void {
    if (!puzzle) {
      return;
    }

    const nextBoard = board
      .split('')
      .map((value, currentIndex) => {
        if (currentIndex !== index) {
          return value;
        }

        return nextValue || '0';
      })
      .join('');

    setBoard(nextBoard);
    setSubmitError(null);
    setSubmitSuccess(null);

    if (completedAt) {
      setCompletedAt(null);
    }
  }

  async function handleSubmitScore(): Promise<void> {
    if (!puzzle || !solved) {
      return;
    }

    if (!user) {
      setSubmitError('Sign in before you submit an official leaderboard time.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await submitCompletion({
        puzzleDate: puzzle.puzzleDate,
        elapsedSeconds,
        finalGrid: board,
      });

      setSubmitSuccess(`Official time saved. You are ranked #${response.leaderboardEntry.rank}.`);
      clearProgress(puzzle.puzzleDate);
      await loadLeaderboard(puzzle.puzzleDate);
    } catch (submitAttemptError) {
      if (submitAttemptError instanceof ApiError) {
        setSubmitError(submitAttemptError.message);
      } else {
        setSubmitError('Could not submit your completion.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Daily Sudoku</p>
          <h1>A single UTC grid, shared by everyone.</h1>
          <p className="supporting-copy">
            Play instantly, keep progress on this device, and sign in only when you want your solve
            time to count on the official board.
          </p>
          {puzzle ? (
            <div className="hero-stats">
              <div className="stat-block">
                <span className="muted-label">Puzzle date</span>
                <strong>{formatPuzzleDateLabel(puzzle.puzzleDate)}</strong>
              </div>
              <div className="stat-block">
                <span className="muted-label">Open cells</span>
                <strong>{puzzle.editableCellCount}</strong>
              </div>
              <div className="stat-block">
                <span className="muted-label">Timer</span>
                <strong data-testid="elapsed-timer">{formatElapsedSeconds(elapsedSeconds)}</strong>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel puzzle-panel">
        {loading ? <p className="muted-label">Loading the daily board…</p> : null}
        {error ? <p className="error-banner">{error}</p> : null}
        {puzzle ? (
          <>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Play surface</p>
                <h2>{formatPuzzleDateLabel(puzzle.puzzleDate)}</h2>
              </div>
              <span className="pill">{puzzle.difficulty}</span>
            </div>
            <SudokuBoard board={board} givens={puzzle.givens} onChange={updateBoard} />
            <div className="status-stack">
              <p className="supporting-copy">
                {solved
                  ? 'Grid solved locally. Submit it if you want an official leaderboard result.'
                  : 'Fill every open cell with digits 1-9. Progress saves automatically in this browser.'}
              </p>
              {!authLoading && !user ? (
                <p className="muted-label">
                  Anonymous mode is fully playable.{' '}
                  <Link href="/auth/signup">Create an account</Link> when you want official scores.
                </p>
              ) : null}
              {submitError ? <p className="error-banner">{submitError}</p> : null}
              {submitSuccess ? <p className="success-banner">{submitSuccess}</p> : null}
            </div>
            <div className="action-row">
              <button
                className="accent-button"
                data-testid="submit-score-button"
                disabled={!solved || submitting}
                type="button"
                onClick={() => void handleSubmitScore()}
              >
                {submitting ? 'Submitting…' : 'Submit official time'}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setBoard(puzzle.givens);
                  setStartedAt(new Date().toISOString());
                  setCompletedAt(null);
                  setSubmitError(null);
                  setSubmitSuccess(null);
                  clearProgress(puzzle.puzzleDate);
                }}
              >
                Reset board
              </button>
            </div>
          </>
        ) : null}
      </section>

      <LeaderboardPanel leaderboard={leaderboard} loading={loading && !leaderboard} />
    </div>
  );
}
