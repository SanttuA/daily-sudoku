'use client';

import type { HistoryResponse } from '@daily-sudoku/contracts';

import { formatElapsedSeconds, formatPuzzleDateLabel } from '../lib/time';

type HistoryPanelProps = {
  history: HistoryResponse | null;
  loading: boolean;
  error: string | null;
};

export function HistoryPanel({ history, loading, error }: HistoryPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Personal history</p>
          <h1>Official daily completions</h1>
        </div>
      </div>
      {loading ? <p className="muted-label">Loading your previous wins…</p> : null}
      {error ? <p className="error-banner">{error}</p> : null}
      {!loading && !error && history?.attempts.length === 0 ? (
        <p className="empty-state">
          No official completions yet. Finish today’s grid to start your record.
        </p>
      ) : null}
      {!loading && history?.attempts.length ? (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Puzzle</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{formatPuzzleDateLabel(attempt.puzzleDate)}</td>
                  <td>{attempt.puzzleId}</td>
                  <td>{formatElapsedSeconds(attempt.elapsedSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
