# Daily Sudoku

A simple daily Sudoku web app built with TypeScript, Turborepo, Next.js, Fastify, Prisma, Vitest, Playwright, Oxlint, Prettier, Docker, and GitHub Actions.

## What ships in v1

- One shared Sudoku puzzle per UTC day.
- Anonymous local play with browser-saved progress.
- Email/password accounts for official score submission.
- Daily leaderboard plus signed-in player history.
- Contract-first API and shared puzzle utilities.

## Workspace Layout

- `apps/web`: Next.js frontend.
- `apps/api`: Fastify API, Prisma schema, auth, leaderboard logic.
- `packages/contracts`: shared Zod schemas and exported TypeScript types.
- `packages/puzzles`: daily puzzle catalog and Sudoku helpers.
- `docs`: product, technical, and acceptance specs.
- `tests/e2e`: Playwright coverage for full-stack browser flows.

## Local Setup

1. Install Node `24.x` and npm.
2. Install Docker and Docker Compose.
3. Copy `.env.example` to `.env` and adjust values if needed.
4. Install dependencies with `npm install`.
5. Start Postgres with `npm run db:up`.
6. Generate Prisma client with `npm run db:generate`.
7. Apply migrations with `npm run db:migrate`.
8. Start both apps with `npm run dev`.

The Prisma helper scripts load the repo root `.env` automatically, so you do not need a separate `apps/api/.env` for normal local setup.
The local Docker Postgres port is `5433` by default so it does not collide with a host PostgreSQL service on `5432`.
The Docker dev database now uses PostgreSQL 18. If you are upgrading from an earlier local major version, recreate the Docker volume with `npm run db:reset` before starting the database again.

Default URLs:

- Web: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:4000`
- Postgres: `127.0.0.1:5433`

The default API CORS config accepts both `http://127.0.0.1:3000` and `http://localhost:3000`.

## Key Commands

- `npm run dev`: run the web app and API together.
- `npm run build`: build every workspace.
- `npm run lint`: run Oxlint across the repo.
- `npm run format:check`: verify formatting with Prettier.
- `npm run typecheck`: run TypeScript checks in every workspace.
- `npm run test`: run Vitest suites in every workspace.
- `npm run test:e2e`: start the local stack and run Playwright with Chromium by default.
- `npm run test:e2e:firefox`: start the local stack and run Playwright in Firefox.
- `npm run test:e2e:all`: start the local stack and run both Chromium and Firefox.
- `npm run db:up`: start local Postgres.
- `npm run db:down`: stop all Docker Compose services.
- `npm run docker:fullstack`: build and run the full stack with Docker.

Playwright browser selection can be controlled in two ways:

- Pass a browser flag: `npm run test:e2e -- --browser=firefox`
- Set `PLAYWRIGHT_BROWSER` to `chromium`, `firefox`, `all`, or `auto`

`auto` picks the first installed browser on the current machine, preferring Chromium and then Firefox. If neither browser is installed, it falls back to Chromium so the error message stays explicit.

The Playwright runner also picks free local ports automatically, so it does not need your normal `npm run dev` stack to be stopped first. If you want fixed ports for debugging, set `PLAYWRIGHT_WEB_PORT`, `PLAYWRIGHT_API_PORT`, or `PLAYWRIGHT_HOST`.

Before running end-to-end tests locally, install at least one Playwright browser:

- `npx playwright install chromium`
- `npx playwright install firefox`

On Linux or WSL, browser binaries may still need system packages. If Firefox or Chromium says host dependencies are missing, run:

- `npx playwright install --with-deps firefox`
- `npx playwright install --with-deps chromium`

## Docker

- `docker compose up -d db`: start only Postgres.
- The local database container uses `postgres:18-alpine`.
- The database is published on host port `5433` and maps to container port `5432`.
- `docker compose --profile fullstack up --build`: run Postgres, API, and web together.
- `apps/api/Dockerfile` and `apps/web/Dockerfile`: production-ready multi-stage images targeting Node 24.

## GitHub Actions

Pull requests run:

- `format:check`
- `lint`
- `typecheck`
- `test`
- `build`
- Playwright Chromium end-to-end checks

## Notes

- The repo is intentionally spec-driven. Update `docs/` before changing behavior.
- Anonymous players never create official leaderboard entries in v1.
- The current execution environment here did not provide a working Node/npm runtime, so the codebase was scaffolded without running installs or tests locally.
