# Technical Spec

## Architecture

- Monorepo managed with npm workspaces and Turborepo.
- `apps/web`: Next.js App Router frontend in TypeScript.
- `apps/api`: Fastify REST API in TypeScript.
- `packages/contracts`: shared Zod schemas and TypeScript types.
- `packages/puzzles`: prebuilt puzzle catalog and deterministic UTC date selection helpers.

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

## Frontend Rules

- Puzzle progress is stored in browser local storage by `puzzleDate`.
- All API calls use the shared contracts package and include credentials when auth is required.
- The homepage is the primary play surface and includes puzzle state, timer, and leaderboard context.

## Docker And Delivery

- Local Postgres is provided through `docker-compose.yml`.
- Full local stack is available with the `fullstack` Compose profile.
- `apps/web/Dockerfile` and `apps/api/Dockerfile` produce production-ready Node 24 images.

## CI

- PR workflow runs formatting, linting, typechecking, Vitest, build, and Playwright Chromium.
- Playwright uses a seeded local stack with Docker-backed Postgres.
