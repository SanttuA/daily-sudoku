# AGENTS

This repository is designed for coding agents and humans to work safely in the same tree.

## Repo Map

- `docs/`: source of truth for product, architecture, and acceptance criteria.
- `apps/web`: user-facing Next.js app.
- `apps/api`: Fastify API and Prisma schema.
- `packages/contracts`: shared API schemas and types.
- `packages/puzzles`: deterministic puzzle catalog and Sudoku helpers.
- `tests/e2e`: Playwright browser coverage.

## Ownership Boundaries

- UI-only changes should stay inside `apps/web` unless shared contracts must change.
- API behavior changes should start in `packages/contracts`, then `apps/api`, then `apps/web`.
- Puzzle rotation or validation changes belong in `packages/puzzles`.
- Database shape changes require Prisma schema, migration SQL, contract review, and acceptance-criteria updates.

## Expected Workflow

1. Read the relevant spec files in `docs/`.
2. Update specs first when behavior changes.
3. Keep interfaces contract-first through `packages/contracts`.
4. Make the smallest coherent vertical slice possible.
5. Add or update Vitest and Playwright coverage for changed behavior.
6. Before handing off changes, run formatting, linting, typechecking, and tests from the repo root.

## Safe Edit Rules

- Do not bypass `packages/contracts` by creating duplicate request or response types in apps.
- Do not hardcode local dates for daily puzzle behavior; use UTC helpers from `packages/puzzles`.
- Do not persist anonymous leaderboard entries in v1.
- Do not edit generated Prisma output by hand.
- Do not change Docker, CI, or runtime versions without updating docs and workflows together.

## Required Verification After Changes

- `npm run format:check`
- If Prettier fails, run `npm run format` and then rerun `npm run format:check`.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- Run these four commands after code, config, schema, or docs changes unless the environment blocks them.
- If user-facing flows, auth flows, or API-to-UI integration changed, also run `npm run test:e2e` when feasible.

## Commands Agents Should Prefer

- `npm run format:check`
- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run db:generate`
- `npm run db:migrate`

## Testing Expectations

- Add Vitest coverage for domain logic and API contracts.
- Add Playwright coverage for end-to-end user journeys whenever page flows change.
- Do not claim work is complete until Prettier, lint, and test checks have been run or explicitly reported as blocked.
- If local runtime tools are unavailable, document exactly which verification commands could not be run.
