import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CatalogPuzzle } from './core';
import { validateCatalog } from './core';

type ImportedPuzzle = CatalogPuzzle;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultOutputPath = path.resolve(__dirname, '../data/catalog.json');

async function main(): Promise<void> {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error('Usage: npm run puzzles:import -- /path/to/catalog.json');
  }

  const source = await readFile(path.resolve(process.cwd(), inputPath), 'utf8');
  const parsed = validateCatalog(JSON.parse(source) as ImportedPuzzle[]);

  await writeFile(defaultOutputPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  console.log(`Imported ${parsed.length} puzzles into ${defaultOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
