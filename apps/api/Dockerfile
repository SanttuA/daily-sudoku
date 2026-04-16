FROM node:24-alpine AS builder

WORKDIR /app
ARG DATABASE_URL=postgresql://daily_sudoku:daily_sudoku@db:5432/daily_sudoku?schema=public
ENV DATABASE_URL=$DATABASE_URL

COPY package.json turbo.json tsconfig.base.json tsconfig.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/puzzles/package.json packages/puzzles/package.json

RUN npm install

COPY . .

RUN npm --workspace @daily-sudoku/contracts run build
RUN npm --workspace @daily-sudoku/puzzles run build
RUN npm --workspace @daily-sudoku/api run prisma:generate
RUN npm --workspace @daily-sudoku/api run build

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app /app

EXPOSE 4000
WORKDIR /app/apps/api

CMD ["sh", "-c", "npm run prisma:migrate:deploy && node dist/index.js"]
