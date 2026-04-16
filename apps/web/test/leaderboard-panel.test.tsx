import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeaderboardPanel } from '../components/leaderboard-panel';

describe('LeaderboardPanel', () => {
  it('renders entries and highlights the current user', () => {
    render(
      <LeaderboardPanel
        leaderboard={{
          puzzleDate: '2026-04-16',
          entries: [
            {
              rank: 1,
              userId: 'user_1',
              displayName: 'Player One',
              puzzleDate: '2026-04-16',
              puzzleId: 'variant-1',
              elapsedSeconds: 111,
              completedAt: '2026-04-16T08:00:00.000Z',
            },
          ],
          currentUserEntry: {
            rank: 1,
            userId: 'user_1',
            displayName: 'Player One',
            puzzleDate: '2026-04-16',
            puzzleId: 'variant-1',
            elapsedSeconds: 111,
            completedAt: '2026-04-16T08:00:00.000Z',
          },
        }}
      />,
    );

    expect(screen.getByText('Player One')).toBeInTheDocument();
    expect(screen.getByText('Your rank #1')).toBeInTheDocument();
  });
});
