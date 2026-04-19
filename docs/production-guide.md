# Production Guide

This guide is for people who want to run the production build of Daily Sudoku on a Docker-friendly machine and then use the app as a player.

## What You Need

- Docker and Docker Compose
- The project source checked out on the machine
- Node `24.x` and npm if you want to use the `npm` helper scripts or run `npm run ci`

## Configure The Environment

1. Copy `.env.example` to `.env`.
2. Set `SESSION_SECRET` to a long random value before sharing the app with other people.
3. Keep `FIXED_UTC_DATE` empty for normal production use.
4. Set `WEB_ORIGIN` to the URL where the web app will be opened.
5. Set `NEXT_PUBLIC_API_BASE_URL` to the URL where the API will be reached.
6. Leave `DOCKER_DATABASE_URL` pointed at `db:5432` unless you intentionally want a different Docker database target.

For the default local production-style setup in this repo, these values work:

- `WEB_ORIGIN=http://127.0.0.1:3000,http://localhost:3000`
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000`

## Optional Preflight Check

If Node and npm are installed on the machine, run these before starting the production stack:

1. `npm install`
2. `npm run ci`
3. `npm run db:reset`

That gives you a clean local database and confirms the repo passes its normal checks before you boot the production images.

## Start The Production Stack

Choose one of these options:

1. Foreground logs: `npm run docker:prod`
2. Background mode: `docker compose --profile fullstack up --build -d`

Default local URLs:

- Web app: `http://127.0.0.1:3000`
- API health: `http://127.0.0.1:4000/health`

## Confirm It Started Correctly

Check these before sharing the app:

1. Run `docker compose ps` and confirm `db`, `api`, and `web` are healthy.
2. Open `http://127.0.0.1:4000/health` and confirm it returns `{ "ok": true }`.
3. Open `http://127.0.0.1:3000/` and confirm the landing page loads.
4. Review container logs and confirm there are no config, Prisma, CORS, auth, or Next runtime errors.

## How To Use The App

1. Open the home page at `/`.
2. Start today's puzzle from the landing page.
3. Play anonymously if you only want local progress in that browser.
4. Sign up or log in before submitting an official score.
5. After a signed-in solve, open `/leaderboard` to see the daily ranking.
6. Open `/history` to see that player's previous completions.
7. Use the header theme switcher if you want to change between light and dark mode.

Important behavior in v1:

- Everyone gets the same puzzle for the current UTC day.
- Anonymous progress stays in the browser only.
- Anonymous players cannot submit official leaderboard scores.
- Signed-in players can retry a puzzle, but only the best valid time counts.

## Stop Or Restart The Production Stack

- Stop everything with `docker compose --profile fullstack down`
- Rebuild and start again with `docker compose --profile fullstack up --build -d`

## Common Problems

- If ports `3000`, `4000`, or `5433` are already in use, stop the conflicting services first.
- If the API starts but auth or browser requests fail, verify that `WEB_ORIGIN` and `NEXT_PUBLIC_API_BASE_URL` match the URLs you are actually using.
- If the database container has stale local data from an older setup, run `npm run db:reset` and start again.
- If you only want to inspect logs in the foreground, use `npm run docker:prod` instead of detached mode.
