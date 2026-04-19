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
- `packages/puzzles`: bundled puzzle catalog, date schedule, generator CLI, and Sudoku helpers.
- `docs`: product, technical, and acceptance specs.
- `tests/e2e`: Playwright coverage for full-stack browser flows.

## Guides

- [Development Guide](docs/development-guide.md): install, run, and use the app in local development.
- [Production Guide](docs/production-guide.md): configure, run, and use the production build on a Docker-friendly machine.

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
The host-side Prisma scripts use `DATABASE_URL`, while the Docker fullstack path maps `DOCKER_DATABASE_URL` into the API container so container migrations do not loop back to the host-only `127.0.0.1:5433` value.
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
- `npm run puzzles:generate -- --days-ahead=365`: top up bundled daily puzzles without changing historical dates.
- `npm run puzzles:import -- /path/to/catalog.json`: replace the bundled catalog manually when needed.
- `npm run docker:fullstack`: build and run the full stack with Docker.
- `npm run docker:prod`: build and run the production Docker images for a local smoke test.

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
- The local production-like path reads `DOCKER_DATABASE_URL`, `WEB_ORIGIN`, `SESSION_SECRET`, `SESSION_TTL_DAYS`, `RATE_LIMIT_MAX`, `FIXED_UTC_DATE`, and `NEXT_PUBLIC_API_BASE_URL` from `.env` when present.

## Local Production Smoke

Use this workflow when you want to prove the production builds can boot and serve the app on a Docker-friendly machine before v1.

1. Copy `.env.example` to `.env`.
2. Set a real-length `SESSION_SECRET`.
3. Leave `FIXED_UTC_DATE` empty for the smoke test unless you intentionally want a pinned date.
4. Keep `WEB_ORIGIN` and `NEXT_PUBLIC_API_BASE_URL` aligned with the web and API URLs you plan to expose locally.
5. Run `npm install`.
6. Run `npm run ci`.
7. Run `npm run db:reset`.
8. Run `npm run docker:prod`.

Before browser testing, confirm:

- `docker compose ps` shows `db`, `api`, and `web` as healthy.
- `http://127.0.0.1:4000/health` returns `{ "ok": true }`.
- `http://127.0.0.1:3000/` loads successfully.
- Container logs stay free of config, Prisma, CORS, auth, or Next runtime errors.

Manual smoke checklist:

- `/` shows landing content and the CTA into `/play`.
- `/play` loads the daily puzzle.
- An anonymous move persists after refresh.
- Anonymous score submission is blocked.
- Sign up works.
- A signed-in solve can be submitted.
- The result appears on `/leaderboard`.
- The result appears on `/history`.
- Logout works.
- Theme toggle persists across reloads and route changes.

When finished, stop the stack with `npm run db:down`.

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
- Daily puzzle lookup is schedule-based, so growing the catalog does not reshuffle already-assigned dates.
- `npm run puzzles:generate -- --days-ahead <days> [--seed value] [--preserve-through YYYY-MM-DD]` bootstraps any missing historical schedule entries, then appends generated `medium` puzzles for unscheduled future dates.

## License

MIT. See [LICENSE](LICENSE).
