import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const scriptPath = path.resolve(process.argv[1] ?? 'scripts/run-prisma.ts');
const __dirname = path.dirname(scriptPath);
const repoRoot = path.resolve(__dirname, '..');
const rootEnvPath = path.join(repoRoot, '.env');
const apiEnvPath = path.join(repoRoot, 'apps', 'api', '.env');
const schemaPath = path.join(repoRoot, 'apps', 'api', 'prisma', 'schema.prisma');
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

loadEnvFile(rootEnvPath);
loadEnvFile(apiEnvPath);

const prismaArgs = [...process.argv.slice(2), '--schema', schemaPath];

const child = spawn(npxCommand, ['prisma', ...prismaArgs], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});

child.once('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

function loadEnvFile(envPath: string): void {
  if (!existsSync(envPath)) {
    return;
  }

  const source = readFileSync(envPath, 'utf8');

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    const nextValue = stripWrappingQuotes(rawValue);
    const previousValue = process.env[key];

    if (key === 'DATABASE_URL' && previousValue && previousValue !== nextValue) {
      console.warn(
        `Overriding existing ${key} with the value from ${path.relative(repoRoot, envPath)} for Prisma.`,
      );
    }

    process.env[key] = nextValue;
  }
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
