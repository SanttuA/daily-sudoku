import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    jsx: {
      importSource: 'react',
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
