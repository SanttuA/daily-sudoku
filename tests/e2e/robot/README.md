# Robot Framework acceptance tests

These suites cover the browser-facing acceptance criteria for gameplay, authentication,
leaderboards, history, themes, and application metadata. Backend-only acceptance rules are
exercised through authenticated API requests from Robot Framework.

## Install

From `tests/e2e/robot`, create the Python environment and initialize Robot Framework Browser:

```bash
uv sync
uv run rfbrowser init
```

## Start the deterministic test stack

The caller is responsible for running a clean web, API, and Postgres stack. The API must use the
fixed UTC date `2026-04-16`, which maps to the puzzle data used by the full-solve tests.

From the repository root:

```bash
npm run db:reset
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
FIXED_UTC_DATE=2026-04-16 npm run dev
```

### Docker Compose full-stack option

You can run the production-style `fullstack` Compose profile instead of starting the development
servers. First remove the previous stack and database volume so leaderboard state cannot leak
between Robot runs:

```bash
docker compose --profile fullstack down -v
```

Then build and start the complete stack with the fixed puzzle date and browser-facing URLs required
by the suites:

```bash
DOCKER_DATABASE_URL='postgresql://daily_sudoku:daily_sudoku@db:5432/daily_sudoku?schema=public' \
WEB_ORIGIN='http://127.0.0.1:3000,http://localhost:3000' \
SESSION_SECRET='robot-framework-session-secret' \
SESSION_TTL_DAYS=30 \
RATE_LIMIT_MAX=200 \
FIXED_UTC_DATE=2026-04-16 \
NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:4000' \
docker compose --profile fullstack up --build -d
```

Wait until `docker compose ps` reports `db`, `api`, and `web` as healthy. The API container applies
database migrations automatically before it starts. Run the Robot command from
`tests/e2e/robot`, and stop the stack afterward with:

```bash
docker compose --profile fullstack down
```

The suites perform a readiness check against `/daily-puzzle` and fail with a clear message if the
API is unavailable or returns another date.

## Run

From `tests/e2e/robot`:

```bash
uv run robot -d results suites
```

The defaults are:

- `WEB_URL=http://127.0.0.1:3000`
- `API_URL=http://127.0.0.1:4000`
- `BROWSER=chromium`

Override them with environment variables:

```bash
WEB_URL=http://localhost:3000 API_URL=http://localhost:4000 BROWSER=firefox \
  uv run robot -d results suites
```

To validate suite syntax without a running application:

```bash
uv run robot --dryrun -d results suites
```
