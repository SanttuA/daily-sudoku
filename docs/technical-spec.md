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
- Browser-facing session responses expose only the minimal signed-in profile needed by the UI.
- Leaderboard responses expose display names and rank context, but not stable internal user IDs.
- Public puzzle responses expose givens and metadata, never the solution.
- Completion submission validates the final grid against the committed puzzle solution.
- Credentialed `POST` routes reject requests whose `Origin` is not explicitly allowed, with a same-origin `Referer` fallback for browsers that omit `Origin`.
- Signup and login enforce stricter per-email and per-IP rate limits than general gameplay traffic.
- API responses include baseline security headers, including CSP, framing protection, and production HSTS.

## Frontend Rules

- Puzzle progress is stored in browser local storage by `puzzleDate`.
- Theme preference is stored in browser local storage and applied to `<html data-theme>` before React hydration.
- Theme bootstrapping is loaded from a first-party static script, but the current static-header CSP still allows inline scripts for the Next.js runtime until a nonce-based policy is introduced.
- All API calls use the shared contracts package and include credentials when auth is required.
- The homepage is a landing page with lightweight daily puzzle context and a CTA into `/play`.
- The `/play` route is the primary play surface and includes the puzzle board, timer, gameplay state, and leaderboard context.
- The gameplay timer stays idle until the player makes their first editable move.
- When no explicit theme preference exists, the web app follows `prefers-color-scheme` and keeps the active theme in sync while the page is open.
- Browser tab, bookmark, Apple touch, and manifest icons are served through Next.js metadata files in `apps/web/app`.
- The web manifest uses an app-style display mode so installed launches open without full browser chrome.
- Web responses include baseline security headers, including CSP, framing protection, and production HSTS.

## Docker And Delivery

- Local Postgres is provided through `docker-compose.yml`.
- Full local stack is available with the `fullstack` Compose profile.
- `apps/web/Dockerfile` and `apps/api/Dockerfile` produce production-ready Node 24 images.

## CI

- PR workflow runs formatting, linting, typechecking, Vitest, build, and Playwright Chromium.
- Playwright uses a seeded local stack with Docker-backed Postgres.
