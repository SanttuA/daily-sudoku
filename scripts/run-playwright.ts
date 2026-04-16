import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import path from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

import { parsePlaywrightBrowserArgs } from './playwright-browser';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const defaultDatabaseUrl =
  'postgresql://daily_sudoku:daily_sudoku@127.0.0.1:5433/daily_sudoku?schema=public';

async function main(): Promise<void> {
  const { browserSelection, passthroughArgs } = parsePlaywrightBrowserArgs(process.argv.slice(2));
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
    DATABASE_URL: process.env.DATABASE_URL ?? defaultDatabaseUrl,
    PORT: String(apiPort),
    HOST: host,
    WEB_ORIGIN: webBaseUrl,
    SESSION_SECRET: process.env.SESSION_SECRET ?? 'playwright-session-secret-1234',
    SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS ?? '30',
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ?? '200',
    FIXED_UTC_DATE: process.env.FIXED_UTC_DATE ?? '2026-04-16',
    NODE_ENV: 'test',
  };
  const webEnv = {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  };

  try {
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

    console.log(
      `Running Playwright with browser selection: ${browserSelection} (web ${webBaseUrl}, api ${apiBaseUrl})`,
    );

    await runChecked(npxCommand, ['playwright', 'test', ...passthroughArgs], {
      ...process.env,
      PLAYWRIGHT_TEST_BASE_URL: webBaseUrl,
      PLAYWRIGHT_BROWSER: browserSelection,
    });
  } finally {
    for (const child of children.reverse()) {
      await stopChild(child);
    }

    try {
      await runChecked('docker', ['compose', 'down', '-v']);
    } catch (cleanupError) {
      console.error('Failed to stop Docker Compose cleanly.');
      console.error(cleanupError);
    }
  }
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
    const parsedPort = parsePort(requestedPort, 'requested Playwright port');

    if (reservedPorts.has(parsedPort)) {
      throw new Error(`Port ${parsedPort} is reserved for another Playwright service.`);
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
