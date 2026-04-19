import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

import { chromium, type Browser, type Page } from '@playwright/test';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const screenshotDatabaseUrl =
  'postgresql://daily_sudoku:daily_sudoku@127.0.0.1:5433/daily_sudoku?schema=readme_screenshots';
const fixedUtcDate = '2026-04-16';
const themeStorageKey = 'daily-sudoku/theme';
const givens = '091340678348062910705918034526407189180529407079680523637094850804176092912803746';
const solution =
  '291345678348762915765918234526437189183529467479681523637294851854176392912853746';
const progressBoard = fillProgressBoard(givens, solution, [0, 12, 24, 38, 50, 64, 76]);

const outputDirectory = path.join(process.cwd(), 'docs/images/readme');
const playCompareOutputPath = path.join(outputDirectory, 'play-compare.png');
const landingOutputPath = path.join(outputDirectory, 'landing-light.png');

async function main(): Promise<void> {
  const children: ChildProcess[] = [];
  const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
  const apiPort = await resolvePort(process.env.PLAYWRIGHT_API_PORT, 4000, host);
  const webPort = await resolvePort(
    process.env.PLAYWRIGHT_WEB_PORT,
    3000,
    host,
    new Set([apiPort]),
  );
  const apiBaseUrl = `http://${host}:${apiPort}`;
  const webBaseUrl = `http://${host}:${webPort}`;
  const apiWorkspace = path.join(process.cwd(), 'apps/api');
  const webWorkspace = path.join(process.cwd(), 'apps/web');
  const apiEnv = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? screenshotDatabaseUrl,
    PORT: String(apiPort),
    HOST: host,
    WEB_ORIGIN: webBaseUrl,
    SESSION_SECRET: process.env.SESSION_SECRET ?? 'readme-screenshot-session-secret-1234',
    SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS ?? '30',
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ?? '200',
    FIXED_UTC_DATE: process.env.FIXED_UTC_DATE ?? fixedUtcDate,
    NODE_ENV: 'test',
  };
  const webEnv = {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  };
  const databaseWasRunning = await isComposeServiceRunning('db');

  try {
    await prepareStack(
      apiEnv,
      apiWorkspace,
      webEnv,
      webWorkspace,
      children,
      apiBaseUrl,
      webBaseUrl,
      host,
      webPort,
    );

    await mkdir(outputDirectory, { recursive: true });

    const browser = await chromium.launch({ headless: true });

    try {
      const lightPlayCapture = await capturePlayRoute(browser, webBaseUrl, 'light');
      const darkPlayCapture = await capturePlayRoute(browser, webBaseUrl, 'dark');
      const landingCapture = await captureLandingRoute(browser, webBaseUrl);
      const compareCapture = await buildPlayCompareImage(
        browser,
        lightPlayCapture,
        darkPlayCapture,
      );

      await writeFile(playCompareOutputPath, compareCapture);
      await writeFile(landingOutputPath, landingCapture);
    } finally {
      await browser.close();
    }
  } finally {
    for (const child of children.reverse()) {
      await stopChild(child);
    }

    if (!databaseWasRunning) {
      try {
        await runChecked('docker', ['compose', 'stop', 'db']);
      } catch (cleanupError) {
        console.error('Failed to stop the Docker database service cleanly.');
        console.error(cleanupError);
      }
    }
  }
}

async function prepareStack(
  apiEnv: NodeJS.ProcessEnv,
  apiWorkspace: string,
  webEnv: NodeJS.ProcessEnv,
  webWorkspace: string,
  children: ChildProcess[],
  apiBaseUrl: string,
  webBaseUrl: string,
  host: string,
  webPort: number,
): Promise<void> {
  await runChecked(npmCommand, ['--workspace', '@daily-sudoku/contracts', 'run', 'build']);
  await runChecked(npmCommand, ['--workspace', '@daily-sudoku/puzzles', 'run', 'build']);
  await runChecked('docker', ['compose', 'up', '-d', 'db']);
  await runChecked(npmCommand, ['run', 'db:generate'], apiEnv);
  await runChecked(npmCommand, ['run', 'db:migrate'], apiEnv);
  await runChecked(npmCommand, ['run', 'db:seed'], apiEnv);

  const apiProcess = startLongRunning(npmCommand, ['run', 'dev:test'], apiEnv, apiWorkspace);
  children.push(apiProcess);
  await waitForUrl(`${apiBaseUrl}/health`);

  const webProcess = startLongRunning(
    npxCommand,
    ['next', 'dev', '--hostname', host, '--port', String(webPort)],
    webEnv,
    webWorkspace,
  );
  children.push(webProcess);
  await waitForUrl(webBaseUrl);
}

async function captureLandingRoute(browser: Browser, webBaseUrl: string): Promise<Buffer> {
  return withCapturePage(browser, {
    route: '/',
    theme: 'light',
    webBaseUrl,
    initStorage: {
      [themeStorageKey]: 'light',
    },
    waitForReady: async (page) => {
      await page.locator('.landing-shell').waitFor({ state: 'visible' });
      await page.locator('.landing-stat-grid').waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        return !document.body.textContent?.includes("Loading today's puzzle details…");
      });
    },
  });
}

async function capturePlayRoute(
  browser: Browser,
  webBaseUrl: string,
  theme: 'light' | 'dark',
): Promise<Buffer> {
  return withCapturePage(browser, {
    route: '/play',
    theme,
    webBaseUrl,
    initStorage: {
      [themeStorageKey]: theme,
      [`daily-sudoku/progress/${fixedUtcDate}`]: JSON.stringify({
        puzzleDate: fixedUtcDate,
        board: progressBoard,
      }),
    },
    waitForReady: async (page) => {
      await page.locator('[data-testid="sudoku-board"]').waitFor({ state: 'visible' });
      await page.locator('[data-testid="theme-toggle"]').waitFor({ state: 'visible' });
      await page.locator('.play-stat-grid').waitFor({ state: 'visible' });
      await page
        .locator('.play-leaderboard .empty-state, .play-leaderboard .leaderboard-list')
        .first()
        .waitFor({ state: 'visible' });
      await page.waitForFunction((expectedTheme) => {
        return document.documentElement.dataset.theme === expectedTheme;
      }, theme);
      await page.waitForFunction(() => {
        return !document.body.textContent?.includes('Loading the daily board…');
      });
    },
  });
}

async function withCapturePage(
  browser: Browser,
  input: {
    route: string;
    theme: 'light' | 'dark';
    webBaseUrl: string;
    initStorage: Record<string, string>;
    waitForReady: (page: Page) => Promise<void>;
  },
): Promise<Buffer> {
  const context = await browser.newContext({
    colorScheme: input.theme,
    deviceScaleFactor: 1,
    viewport: {
      width: 1440,
      height: 1180,
    },
  });

  await context.addInitScript(
    ({ entries }) => {
      if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return;
      }

      for (const [key, value] of Object.entries(entries)) {
        window.localStorage.setItem(key, value);
      }
    },
    { entries: input.initStorage },
  );

  const page = await context.newPage();

  try {
    await page.goto(`${input.webBaseUrl}${input.route}`, { waitUntil: 'domcontentloaded' });
    await input.waitForReady(page);
    await sleep(250);

    return await page.locator('.app-frame').screenshot({ type: 'png' });
  } finally {
    await context.close();
  }
}

async function buildPlayCompareImage(
  browser: Browser,
  lightPlayCapture: Buffer,
  darkPlayCapture: Buffer,
): Promise<Buffer> {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: {
      width: 1720,
      height: 1180,
    },
  });
  const page = await context.newPage();
  const lightPlayDataUrl = toDataUrl(lightPlayCapture);
  const darkPlayDataUrl = toDataUrl(darkPlayCapture);

  try {
    await page.setContent(
      `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <style>
              :root {
                color-scheme: dark;
                --card-background: rgba(37, 29, 24, 0.88);
                --card-border: rgba(255, 239, 220, 0.14);
                --foreground: #f5ede2;
                --muted: rgba(245, 237, 226, 0.72);
                --accent: #db7a39;
              }

              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                min-height: 100vh;
                font-family: "Avenir Next", "Segoe UI", sans-serif;
                background:
                  radial-gradient(circle at top left, rgba(219, 122, 57, 0.22), transparent 28%),
                  radial-gradient(circle at top right, rgba(143, 178, 159, 0.2), transparent 22%),
                  linear-gradient(180deg, #18130f 0%, #201914 50%, #2b221b 100%);
                color: var(--foreground);
              }

              .canvas {
                width: 1720px;
                padding: 44px;
              }

              .header {
                margin-bottom: 24px;
              }

              .eyebrow {
                margin: 0 0 8px;
                color: #ffcfaa;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
              }

              h1 {
                margin: 0;
                font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
                font-size: 42px;
                line-height: 1.05;
              }

              .supporting {
                margin: 10px 0 0;
                max-width: 760px;
                color: var(--muted);
                font-size: 18px;
                line-height: 1.5;
              }

              .compare-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 24px;
              }

              figure {
                margin: 0;
                padding: 18px;
                border-radius: 28px;
                border: 1px solid var(--card-border);
                background: var(--card-background);
                box-shadow: 0 30px 80px rgba(0, 0, 0, 0.38);
              }

              figcaption {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 14px;
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              }

              .theme-chip {
                padding: 7px 11px;
                border-radius: 999px;
                background: rgba(219, 122, 57, 0.16);
                color: #ffcfaa;
              }

              img {
                display: block;
                width: 100%;
                border-radius: 22px;
                border: 1px solid rgba(255, 239, 220, 0.08);
              }
            </style>
          </head>
          <body>
            <main class="canvas">
              <header class="header">
                <p class="eyebrow">README Preview</p>
                <h1>Daily puzzle play view in both themes</h1>
                <p class="supporting">
                  Real browser captures of the same seeded anonymous game state on April 16, 2026.
                </p>
              </header>
              <section class="compare-grid">
                <figure>
                  <figcaption>
                    <span>Light mode</span>
                    <span class="theme-chip">/play</span>
                  </figcaption>
                  <img alt="Daily Sudoku play view in light mode" src="${lightPlayDataUrl}" />
                </figure>
                <figure>
                  <figcaption>
                    <span>Dark mode</span>
                    <span class="theme-chip">/play</span>
                  </figcaption>
                  <img alt="Daily Sudoku play view in dark mode" src="${darkPlayDataUrl}" />
                </figure>
              </section>
            </main>
          </body>
        </html>
      `,
      { waitUntil: 'load' },
    );

    return await page.locator('.canvas').screenshot({ type: 'png' });
  } finally {
    await context.close();
  }
}

function fillProgressBoard(baseBoard: string, solvedBoard: string, indexes: number[]): string {
  return baseBoard
    .split('')
    .map((value, index) => {
      if (value !== '0' || !indexes.includes(index)) {
        return value;
      }

      return solvedBoard[index] ?? value;
    })
    .join('');
}

function toDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function startLongRunning(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd: string = process.cwd(),
): ChildProcess {
  return spawn(command, args, {
    cwd,
    env,
    stdio: 'inherit',
  });
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }

      resolve();
    }, 5_000);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function runChecked(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
    });
  });
}

async function getCommandOutput(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (chunk) => {
      stdoutChunks.push(String(chunk));
    });
    child.stderr?.on('data', (chunk) => {
      stderrChunks.push(String(chunk));
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve(stdoutChunks.join('').trim());
        return;
      }

      reject(
        new Error(`Command failed: ${command} ${args.join(' ')}\n${stderrChunks.join('').trim()}`),
      );
    });
  });
}

async function isComposeServiceRunning(service: string): Promise<boolean> {
  try {
    const output = await getCommandOutput('docker', ['compose', 'ps', '-q', service]);
    return output.length > 0;
  } catch {
    return false;
  }
}

async function waitForUrl(url: string): Promise<void> {
  const timeoutAt = Date.now() + 60_000;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the service is ready.
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function resolvePort(
  requestedPort: string | undefined,
  preferredPort: number,
  host: string,
  reservedPorts: Set<number> = new Set(),
): Promise<number> {
  if (requestedPort) {
    const parsedPort = parsePort(requestedPort, 'requested screenshot port');

    if (reservedPorts.has(parsedPort)) {
      throw new Error(`Port ${parsedPort} is reserved for another screenshot service.`);
    }

    if (!(await isPortAvailable(parsedPort, host))) {
      throw new Error(`Port ${parsedPort} is already in use on ${host}.`);
    }

    return parsedPort;
  }

  for (let candidate = preferredPort; candidate < preferredPort + 25; candidate += 1) {
    if (reservedPorts.has(candidate)) {
      continue;
    }

    if (await isPortAvailable(candidate, host)) {
      return candidate;
    }
  }

  return findEphemeralPort(host, reservedPorts);
}

function parsePort(value: string, label: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return parsed;
}

async function findEphemeralPort(host: string, reservedPorts: Set<number>): Promise<number> {
  while (true) {
    const port = await new Promise<number>((resolve, reject) => {
      const server = createServer();

      server.once('error', reject);
      server.listen(0, host, () => {
        const address = server.address();

        if (!address || typeof address === 'string') {
          server.close(() => reject(new Error('Could not determine an ephemeral port.')));
          return;
        }

        const selectedPort = address.port;
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(selectedPort);
        });
      });
    });

    if (!reservedPorts.has(port)) {
      return port;
    }
  }
}

async function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const server = createServer();

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.listen(port, host, () => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(true);
      });
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
