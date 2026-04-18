'use client';

import type { DailyLeaderboardResponse } from '@daily-sudoku/contracts';

import { formatElapsedSeconds, formatPuzzleDateLabel } from '../lib/time';

type LeaderboardPanelProps = {
  leaderboard: DailyLeaderboardResponse | null;
  loading?: boolean;
};

export function LeaderboardContent({ leaderboard, loading = false }: LeaderboardPanelProps) {
  return (
    <>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h2>{leaderboard ? formatPuzzleDateLabel(leaderboard.puzzleDate) : 'Daily board'}</h2>
        </div>
        {leaderboard?.currentUserEntry ? (
          <span className="pill">Your rank #{leaderboard.currentUserEntry.rank}</span>
        ) : null}
      </div>
      {loading ? <p className="muted-label">Loading daily rankings…</p> : null}
      {!loading && leaderboard && leaderboard.entries.length === 0 ? (
        <p className="empty-state">No official scores yet. Be the first signed-in solver today.</p>
      ) : null}
      {!loading && leaderboard?.entries.length ? (
        <ol className="leaderboard-list" data-testid="leaderboard-list">
          {leaderboard.entries.map((entry) => (
            <li
              key={`${entry.puzzleDate}-${entry.rank}`}
              className={entry.isCurrentUser ? 'leaderboard-item current-user' : 'leaderboard-item'}
            >
              <span className="leaderboard-rank">#{entry.rank}</span>
              <span className="leaderboard-name">{entry.displayName}</span>
              <span className="leaderboard-time">{formatElapsedSeconds(entry.elapsedSeconds)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </>
  );
}

export function LeaderboardPanel(props: LeaderboardPanelProps) {
  return (
    <section className="panel">
      <LeaderboardContent {...props} />
    </section>
  );
}
