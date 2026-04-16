FROM node:24-alpine AS builder

WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY package.json turbo.json tsconfig.base.json tsconfig.json .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/puzzles/package.json packages/puzzles/package.json

RUN npm install

COPY . .

RUN npm --workspace @daily-sudoku/contracts run build
RUN npm --workspace @daily-sudoku/puzzles run build
RUN npm --workspace @daily-sudoku/web run build

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
