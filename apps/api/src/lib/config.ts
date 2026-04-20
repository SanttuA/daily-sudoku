import path from 'node:path';

import { z } from 'zod';

import { loadEnvFile } from './prisma-env';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  WEB_ORIGIN: z.string().default('http://127.0.0.1:3000,http://localhost:3000'),
  SESSION_SECRET: z.string().min(16),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(50),
  FIXED_UTC_DATE: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function loadConfigEnvFiles(
  targetEnv: Record<string, string | undefined> = process.env,
  cwd = process.cwd(),
): void {
  const protectedEnvKeys = new Set(
    Object.entries(targetEnv)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key),
  );
  const { apiRoot, repoRoot } = resolveRuntimeRoots(cwd);

  loadEnvFile(path.join(repoRoot, '.env'), targetEnv, protectedEnvKeys);
  loadEnvFile(path.join(apiRoot, '.env'), targetEnv, protectedEnvKeys);
}

export type AppConfig = {
  databaseUrl: string;
  port: number;
  host: string;
  webOrigins: string[];
  sessionSecret: string;
  sessionTtlDays: number;
  rateLimitMax: number;
  fixedUtcDate?: string;
  nodeEnv: 'development' | 'test' | 'production';
};

export function createConfig(source: Record<string, string | undefined>): AppConfig {
  const parsed = envSchema.parse(source);

  return {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    host: parsed.HOST,
    webOrigins: parsed.WEB_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    sessionSecret: parsed.SESSION_SECRET,
    sessionTtlDays: parsed.SESSION_TTL_DAYS,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    fixedUtcDate: parsed.FIXED_UTC_DATE,
    nodeEnv: parsed.NODE_ENV,
  };
}

function resolveRuntimeRoots(cwd: string): { apiRoot: string; repoRoot: string } {
  const currentDirectory = path.resolve(cwd);
  const apiRootSuffix = path.join('apps', 'api');

  if (currentDirectory.endsWith(apiRootSuffix)) {
    return {
      apiRoot: currentDirectory,
      repoRoot: path.resolve(currentDirectory, '..', '..'),
    };
  }

  return {
    apiRoot: path.join(currentDirectory, 'apps', 'api'),
    repoRoot: currentDirectory,
  };
}
