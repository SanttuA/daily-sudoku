import { existsSync } from 'node:fs';

import { chromium, defineConfig, devices, firefox } from '@playwright/test';

import {
  type PlaywrightBrowserSelection,
  resolvePlaywrightBrowserSelection,
} from './scripts/playwright-browser';

const browserSelection = resolvePlaywrightBrowserSelection(process.env.PLAYWRIGHT_BROWSER);

const projectDefinitions = {
  chromium: {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
    },
  },
  firefox: {
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
    },
  },
};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: resolveProjects(browserSelection),
});

function resolveProjects(selection: PlaywrightBrowserSelection) {
  if (selection === 'all') {
    return [projectDefinitions.chromium, projectDefinitions.firefox];
  }

  if (selection === 'auto') {
    const installedProjects = [
      isBrowserInstalled(chromium) ? projectDefinitions.chromium : null,
      isBrowserInstalled(firefox) ? projectDefinitions.firefox : null,
    ].filter((project) => project !== null);

    return installedProjects.length > 0 ? installedProjects : [projectDefinitions.chromium];
  }

  return [projectDefinitions[selection]];
}

function isBrowserInstalled(browserType: { executablePath(): string }): boolean {
  try {
    return existsSync(browserType.executablePath());
  } catch {
    return false;
  }
}
