'use client';

import type { DailyLeaderboardResponse, DailyPuzzle } from '@daily-sudoku/contracts';
import { isPlayableBoardState, isSolvedByRules } from '@daily-sudoku/puzzles';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiError, getDailyLeaderboard, getDailyPuzzle, submitCompletion } from '../lib/api';
import { clearProgress, loadProgress, saveProgress } from '../lib/puzzle-progress';
import { formatElapsedSeconds, formatPuzzleDateLabel } from '../lib/time';
import { useAuth } from './auth-provider';
import { LeaderboardContent } from './leaderboard-panel';
import { SudokuBoard } from './sudoku-board';

function isSolvedBoard(givens: string, board: string): boolean {
  return /^[1-9]{81}$/.test(board) && isPlayableBoardState(givens, board) && isSolvedByRules(board);
}

export function DailySudokuExperience() {
  const { user, loading: authLoading } = useAuth();
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardResponse | null>(null);
  const [board, setBoard] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
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
  }, [puzzle?.puzzleDate, user?.displayName]);

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

  useEffect(() => {
    if (!puzzle || board !== puzzle.givens || startedAt || completedAt) {
      return;
    }

    clearProgress(puzzle.puzzleDate);
  }, [board, completedAt, puzzle, startedAt]);

  const solved = !!puzzle && isSolvedBoard(puzzle.givens, board);

  useEffect(() => {
    if (solved && !completedAt) {
      setCompletedAt(new Date().toISOString());
      setSubmitError(null);
    }
  }, [completedAt, solved]);

  const displayElapsedSeconds =
    startedAt === null
      ? 0
      : Math.max(
          0,
          Math.floor(
            ((completedAt ? new Date(completedAt).getTime() : clockTick) -
              new Date(startedAt).getTime()) /
              1000,
          ),
        );

  const submissionElapsedSeconds = startedAt === null ? 0 : Math.max(1, displayElapsedSeconds);

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
        storedProgress?.completedAt && isSolvedBoard(nextPuzzle.givens, restoredBoard)
          ? storedProgress.completedAt
          : null;
      const restoredStartedAt =
        restoredBoard === nextPuzzle.givens && restoredCompletion === null
          ? null
          : (storedProgress?.startedAt ?? restoredCompletion ?? null);

      setPuzzle(nextPuzzle);
      setBoard(restoredBoard);
      setStartedAt(restoredStartedAt);
      setCompletedAt(restoredCompletion);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the daily puzzle.');
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard(puzzleDate: string): Promise<void> {
    setLeaderboardLoading(true);

    try {
      const response = await getDailyLeaderboard(puzzleDate);
      setLeaderboard(response);
    } catch {
      setLeaderboard(null);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  function updateBoard(index: number, nextValue: string): void {
    if (!puzzle || puzzle.givens[index] !== '0') {
      return;
    }

    const replacement = nextValue || '0';

    if (board[index] === replacement) {
      return;
    }

    const nextBoard = board
      .split('')
      .map((value, currentIndex) => {
        if (currentIndex !== index) {
          return value;
        }

        return replacement;
      })
      .join('');

    if (!startedAt) {
      setStartedAt(new Date().toISOString());
    }

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

    if (!startedAt) {
      setSubmitError('Could not determine your solve time. Reset the board and try again.');
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
        elapsedSeconds: submissionElapsedSeconds,
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

  function resetBoard(): void {
    if (!puzzle) {
      return;
    }

    setBoard(puzzle.givens);
    setStartedAt(null);
    setCompletedAt(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    clearProgress(puzzle.puzzleDate);
  }

  return (
    <div className="play-layout">
      <section className="panel play-board-panel">
        {loading ? <p className="muted-label">Loading the daily board…</p> : null}
        {error ? <p className="error-banner">{error}</p> : null}
        {puzzle ? (
          <SudokuBoard board={board} givens={puzzle.givens} onChange={updateBoard} />
        ) : null}
      </section>

      <aside className="panel play-sidebar">
        {puzzle ? (
          <>
            <div className="play-info-stack">
              <div className="panel-header play-sidebar-header">
                <div>
                  <p className="eyebrow">Today&apos;s puzzle</p>
                  <h1>{formatPuzzleDateLabel(puzzle.puzzleDate)}</h1>
                </div>
                <span className="pill">{puzzle.difficulty}</span>
              </div>
              <p className="supporting-copy">
                The timer stays still until your first editable move. Progress saves automatically
                in this browser while you play.
              </p>
              <div className="play-stat-grid">
                <div className="play-stat-card">
                  <span className="muted-label">Timer</span>
                  <strong data-testid="elapsed-timer">
                    {formatElapsedSeconds(displayElapsedSeconds)}
                  </strong>
                </div>
                <div className="play-stat-card">
                  <span className="muted-label">Open cells</span>
                  <strong>{puzzle.editableCellCount}</strong>
                </div>
              </div>
              <div className="status-stack">
                <p className="supporting-copy">
                  {solved
                    ? 'Grid solved locally. Submit it if you want an official leaderboard result.'
                    : 'Fill every open cell with digits 1-9. The timer begins on your first move.'}
                </p>
                {!authLoading && !user ? (
                  <p className="muted-label">
                    Anonymous mode is fully playable.{' '}
                    <Link href="/auth/signup">Create an account</Link> when you want official
                    scores.
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
                <button className="ghost-button" type="button" onClick={resetBoard}>
                  Reset board
                </button>
              </div>
            </div>
            <div className="play-divider" />
            <div className="play-leaderboard">
              <LeaderboardContent leaderboard={leaderboard} loading={leaderboardLoading} />
            </div>
          </>
        ) : (
          <p className="muted-label">
            {loading
              ? 'Loading game info…'
              : "Game details will appear here once today's puzzle is available."}
          </p>
        )}
      </aside>
    </div>
  );
}
