'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { DailyPuzzle } from '@daily-sudoku/contracts';

import { getDailyPuzzle } from '../lib/api';
import { formatPuzzleDateLabel } from '../lib/time';

export function LandingExperience() {
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPuzzle();
  }, []);

  async function loadPuzzle(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await getDailyPuzzle();
      setPuzzle(response.puzzle);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load today's puzzle.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-shell">
      <section className="hero-card landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Daily Sudoku</p>
          <h1>Arrive calm. Solve when you&apos;re ready.</h1>
          <p className="supporting-copy">
            One shared UTC puzzle, a clean start page, and a focused play view when it&apos;s time
            to lock in.
          </p>
          <div className="landing-actions">
            <Link className="accent-button" href="/play">
              Play today&apos;s puzzle
            </Link>
            <Link className="ghost-button" href="/leaderboard">
              View leaderboard
            </Link>
          </div>
        </div>
      </section>

      <section className="panel landing-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Daily briefing</p>
            <h2>Today&apos;s board</h2>
          </div>
          {puzzle ? <span className="pill">{puzzle.difficulty}</span> : null}
        </div>
        <p className="supporting-copy">
          Check the essentials, then move into the play screen when you want the timer to begin on
          your first move.
        </p>
        {loading ? <p className="muted-label">Loading today&apos;s puzzle details…</p> : null}
        {error ? <p className="error-banner">{error}</p> : null}
        {puzzle ? (
          <div className="landing-stat-grid">
            <div className="stat-block">
              <span className="muted-label">Puzzle date</span>
              <strong>{formatPuzzleDateLabel(puzzle.puzzleDate)}</strong>
            </div>
            <div className="stat-block">
              <span className="muted-label">Difficulty</span>
              <strong>{puzzle.difficulty}</strong>
            </div>
            <div className="stat-block">
              <span className="muted-label">Open cells</span>
              <strong>{puzzle.editableCellCount}</strong>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
