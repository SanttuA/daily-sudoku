import path from 'node:path';
import { spawn } from 'node:child_process';

import { loadEnvFile } from '../apps/api/src/lib/prisma-env';

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
