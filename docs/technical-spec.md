# Technical Spec

## Architecture

- Monorepo managed with npm workspaces and Turborepo.
- `apps/web`: Next.js App Router frontend in TypeScript.
- `apps/api`: Fastify REST API in TypeScript.
- `packages/contracts`: shared Zod schemas and TypeScript types.
- `packages/puzzles`: bundled puzzle catalog, bundled per-date schedule, UTC helpers, and offline puzzle generation utilities.

## Runtime And Tooling

- Node 24 LTS.
- Prisma with Postgres.
- Vitest for unit, contract, component, and API integration tests.
- Playwright for full-stack browser tests.
- Oxlint for linting.
- Prettier for formatting.
- Docker Compose for local orchestration.
- GitHub Actions for pull request validation.

## Data Model

- `User`: email, display name, password hash, created timestamp.
- `Session`: user relation, hashed token, expiry, created timestamp.
- `CompletionAttempt`: user relation, puzzle date, puzzle id, elapsed seconds, final grid, completion timestamp.

## API Rules

- REST endpoints are defined contract-first in `packages/contracts`.
- Auth uses secure `httpOnly` cookies backed by a server-side session table.
- Public puzzle responses expose givens and metadata, never the solution.
- Completion submission validates the final grid against the committed puzzle solution.

## Puzzle Supply Rules

- Daily puzzle selection resolves from a bundled `schedule.json` date map, not modulo rotation.
- Historical date assignments stay stable when the catalog grows.
- New bundled puzzles are generated offline in `packages/puzzles` and committed before deploy/runtime.
- Generator output is intentionally `medium`-labeled in v1 and does not include heuristic difficulty grading yet.

## Frontend Rules

- Puzzle progress is stored in browser local storage by `puzzleDate`.
- Theme preference is stored in browser local storage and applied to `<html data-theme>` before React hydration.
- All API calls use the shared contracts package and include credentials when auth is required.
- The homepage is a landing page with lightweight daily puzzle context and a CTA into `/play`.
- The `/play` route is the primary play surface and includes the puzzle board, timer, gameplay state, and leaderboard context.
- The gameplay timer stays idle until the player makes their first editable move.
- When no explicit theme preference exists, the web app follows `prefers-color-scheme` and keeps the active theme in sync while the page is open.
- Browser tab, bookmark, Apple touch, and manifest icons are served through Next.js metadata files in `apps/web/app`.
- The web manifest uses an app-style display mode so installed launches open without full browser chrome.

## Docker And Delivery

- Local Postgres is provided through `docker-compose.yml`.
- Full local stack is available with the `fullstack` Compose profile.
- `apps/web/Dockerfile` and `apps/api/Dockerfile` produce production-ready Node 24 images.
- Local production validation uses the `fullstack` Compose profile to boot the production images and real production startup commands.
- The Compose production path reads browser-facing env values such as `WEB_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL`, `SESSION_SECRET`, and an optional `DOCKER_DATABASE_URL` from the environment or `.env`.
- Future puzzle coverage is topped up with `npm run puzzles:generate -- --days-ahead <days> [--seed value] [--preserve-through YYYY-MM-DD]`.

## CI

- PR workflow runs formatting, linting, typechecking, Vitest, build, and Playwright Chromium.
- Playwright uses a seeded local stack with Docker-backed Postgres.
