import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'apps/api/prisma/schema.prisma',
  migrations: {
    path: 'apps/api/prisma/migrations',
    seed: 'npm --workspace @daily-sudoku/api run seed',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
