import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { CatalogPuzzle, PuzzleSchedule } from './core';
import { validateCatalog, validateSchedule } from './core';

type ImportedPuzzle = CatalogPuzzle;
type ImportCatalogOptions = {
  inputPath: string;
  outputPath?: string;
  schedulePath?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultOutputPath = path.resolve(__dirname, '../data/catalog.json');
const defaultSchedulePath = path.resolve(__dirname, '../data/schedule.json');

export async function importCatalogFile(options: ImportCatalogOptions): Promise<{
  outputPath: string;
  puzzleCount: number;
}> {
  const resolvedInputPath = path.resolve(process.cwd(), options.inputPath);
  const outputPath = options.outputPath ?? defaultOutputPath;
  const schedulePath = options.schedulePath ?? defaultSchedulePath;
  const source = await readFile(resolvedInputPath, 'utf8');
  const parsed = validateCatalog(JSON.parse(source) as ImportedPuzzle[]);

  if (await fileExists(schedulePath)) {
    const scheduleSource = await readFile(schedulePath, 'utf8');
    validateSchedule(JSON.parse(scheduleSource) as PuzzleSchedule, parsed);
  }

  await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');

  return {
    outputPath,
    puzzleCount: parsed.length,
  };
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error('Usage: npm run puzzles:import -- /path/to/catalog.json');
  }

  const result = await importCatalogFile({
    inputPath,
  });

  console.log(`Imported ${result.puzzleCount} puzzles into ${result.outputPath}`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
