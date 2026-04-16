'use client';

import { useEffect, useState } from 'react';

import type { DailyLeaderboardResponse } from '@daily-sudoku/contracts';

import { getDailyLeaderboard, getDailyPuzzle } from '../../lib/api';
import { LeaderboardPanel } from '../../components/leaderboard-panel';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const puzzle = await getDailyPuzzle();
        const board = await getDailyLeaderboard(puzzle.puzzle.puzzleDate);
        setLeaderboard(board);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load leaderboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="single-column">
      {error ? <p className="error-banner">{error}</p> : null}
      <LeaderboardPanel leaderboard={leaderboard} loading={loading} />
    </div>
  );
}
