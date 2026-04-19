import { existsSync, readFileSync } from 'node:fs';

export function loadEnvFile(
  envPath: string,
  targetEnv: Record<string, string | undefined> = process.env,
): void {
  if (!existsSync(envPath)) {
    return;
  }

  const source = readFileSync(envPath, 'utf8');
  applyEnvSource(source, targetEnv);
}

export function applyEnvSource(
  source: string,
  targetEnv: Record<string, string | undefined>,
): void {
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

    if (targetEnv[key] !== undefined) {
      continue;
    }

    targetEnv[key] = nextValue;
  }
}

export function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
