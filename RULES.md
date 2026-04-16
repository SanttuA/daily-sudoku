# RULES

## Spec-First

- Update `docs/product-spec.md`, `docs/technical-spec.md`, or `docs/acceptance-criteria.md` before implementing behavior changes that alter product expectations.
- Treat acceptance criteria as the minimum definition of done for feature work.

## Contract-First

- Define or update shared Zod schemas in `packages/contracts` before changing request or response shapes.
- Keep the web app and API aligned through exported shared types only.

## Daily Puzzle Rules

- There is exactly one official puzzle per UTC day.
- Daily puzzle selection must be deterministic from the UTC date and the committed puzzle catalog.
- Anonymous users may play and resume locally, but only authenticated users may post official scores.

## Auth And Security

- Passwords must be hashed with Argon2.
- Sessions must be server-side and represented in the browser with `httpOnly` cookies.
- Auth routes and completion submission must be rate limited.
- Do not expose puzzle solutions through public API responses.

## Database Discipline

- Prisma schema changes require a migration file.
- Keep puzzle-of-the-day identity derived from UTC date; do not add a daily puzzle table unless the spec changes.
- Persist only data that v1 explicitly needs: users, sessions, and official completions.

## Testing

- Domain logic belongs in fast Vitest tests.
- API behavior must be covered with request-level tests.
- Critical user journeys must be covered with Playwright Chromium in CI.
- After changes, run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run test` from the repo root.
- If `format:check` fails, run `npm run format` and rerun the check before handing work off.
- If a change affects end-to-end flows, auth, or API/UI integration, run `npm run test:e2e` when the environment supports it.

## Definition Of Done

- Specs, code, tests, docs, Docker, and CI all reflect the same behavior.
- Formatting, linting, typechecking, and automated tests pass in CI.
- Any unverified area is called out explicitly in the change summary, with the exact commands that were blocked or skipped.
