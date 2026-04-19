# Development Guide

This guide is for people who want to install Daily Sudoku locally, run it in development mode, and use the app while working on it.

## What You Need

- Node `24.x`
- npm
- Docker and Docker Compose

## Install

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.

The default `.env` values are set up for local development. You can usually leave them as-is.

## Start The Development Stack

1. Start Postgres with `npm run db:up`.
2. Generate Prisma client with `npm run db:generate`.
3. Apply database migrations with `npm run db:migrate`.
4. Start the web app and API with `npm run dev`.

Default local URLs:

- Web app: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:4000`
- Postgres: `127.0.0.1:5433`

If you are upgrading from an older local database volume and Postgres fails to start cleanly, run `npm run db:reset` and then start again from step 1.

## How To Use The App In Development

1. Open `http://127.0.0.1:3000`.
2. Read the landing page and choose the button that takes you to today's puzzle.
3. Play anonymously on `/play` if you just want to test gameplay.
4. Refresh the page to confirm that in-browser progress stays saved.
5. Open `/auth/signup` to create an account if you want to test official score submission.
6. After solving a puzzle while signed in, open `/leaderboard` to see the daily ranking.
7. Open `/history` to see the signed-in player's saved completions.
8. Use the theme switcher in the header to test light and dark mode persistence.

Important behavior in v1:

- Anonymous players can play the full puzzle.
- Anonymous players cannot submit official leaderboard scores.
- Official scores require signing up or logging in first.

## Useful Commands

- `npm run dev`: run the web app and API together
- `npm run test`: run Vitest suites
- `npm run test:e2e:chromium`: run the main Playwright browser flow
- `npm run lint`: run Oxlint
- `npm run typecheck`: run TypeScript checks
- `npm run db:down`: stop Docker services
- `npm run db:reset`: remove the local database volume and start fresh

## Stop The Development Stack

1. Press `Ctrl+C` in the terminal running `npm run dev`.
2. Stop Docker services with `npm run db:down`.

## Common Problems

- If port `5433` is already in use, stop the other Postgres container or service first.
- If the database schema looks out of date, rerun `npm run db:migrate`.
- If you want a completely clean local database, run `npm run db:reset`.
- If login or session behavior looks wrong, confirm that your browser is using `http://127.0.0.1:3000` and not a different origin.
