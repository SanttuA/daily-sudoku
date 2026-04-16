# Product Spec

## Goal

Ship a simple daily Sudoku website where anyone can play the same daily puzzle, while registered users can save official scores and compete on a leaderboard.

## Audience

- Casual daily puzzle players.
- Returning players who want a lightweight streak-like habit.
- Competitive players who care about solve time and ranking.

## Core User Flows

### Anonymous Play

1. Visit the home page.
2. Load the current UTC daily puzzle.
3. Play immediately with no sign-in requirement.
4. Refresh or return later and resume from browser-local progress.
5. If the puzzle is solved while anonymous, show a prompt to create an account or sign in to submit future scores.

### Registered Play

1. Create an account with email, display name, and password.
2. Log in and load the same daily puzzle as everyone else.
3. Solve the puzzle and submit an official completion.
4. Appear on the daily leaderboard.
5. View personal completion history from prior days.

## Game Rules

- One official puzzle per UTC day.
- Leaderboard rank is ordered by lowest `elapsedSeconds`, then earliest valid completion time as tie-breaker.
- A signed-in player may retry the same day, but only their best valid time counts.
- Anonymous players do not create official leaderboard entries in v1.

## Out Of Scope For V1

- Hints or candidate notes.
- Multiplayer or head-to-head play.
- Social features, comments, or friends.
- Cross-device sync for anonymous progress.
- Admin moderation tools.
- Multiple daily difficulty ladders.
