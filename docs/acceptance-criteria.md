# Acceptance Criteria

## Gameplay

- Visiting `/` shows a landing page with daily puzzle context and a primary CTA to `/play`.
- Visiting `/play` loads the current daily puzzle for the active UTC date.
- The puzzle board prevents edits to givens and allows only digits `1` through `9` in editable cells.
- Entered progress persists across browser refreshes for anonymous and authenticated users.
- The elapsed timer stays at `00:00` until the first editable move, then stops increasing when the puzzle is solved.
- Solving the board shows completion feedback and the elapsed timer stops increasing.

## Auth

- A new user can sign up with email, display name, and password.
- A returning user can log in and log out.
- Auth state survives page reload through a secure session cookie.

## Leaderboards And History

- A signed-in user can submit a valid solved board for the active daily puzzle.
- Submitting an invalid board is rejected.
- The daily leaderboard shows best valid times sorted by rank rules.
- A slower retry does not replace an existing better score.
- A faster retry replaces the previous score for that day.
- The signed-in history page lists prior completions ordered by most recent puzzle date first.

## Anonymous Rules

- Anonymous users can fully play the daily puzzle without signing in.
- Anonymous users cannot submit official leaderboard scores.

## UI

- A light or dark mode switcher is available from the global header on every page.
- On a first visit with no saved choice, the active theme follows the browser or OS color preference.
- After a user switches to light or dark mode, that choice persists across refreshes and route changes in the same browser.
- Light and dark theme styling apply consistently to the landing page, play page, auth pages, leaderboard page, and history page.
- Browser metadata exposes Daily Sudoku icons for tabs, bookmarks, and install surfaces.

## Ops

- The repo includes Docker setup for local Postgres and optional full-stack runs.
- The repo includes GitHub Actions PR checks for format, lint, typecheck, Vitest, build, and Playwright.
