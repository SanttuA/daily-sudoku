import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isSolvedByRules, matchesGivens } from './index';

type ImportedPuzzle = {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  givens: string;
  solution: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultOutputPath = path.resolve(__dirname, '../data/catalog.json');

async function main(): Promise<void> {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error('Usage: npm run puzzles:import -- /path/to/catalog.json');
  }

  const source = await readFile(path.resolve(process.cwd(), inputPath), 'utf8');
  const parsed = JSON.parse(source) as ImportedPuzzle[];

  for (const puzzle of parsed) {
    if (!/^[0-9]{81}$/.test(puzzle.givens)) {
      throw new Error(`Puzzle ${puzzle.id} has invalid givens.`);
    }

    if (!/^[1-9]{81}$/.test(puzzle.solution)) {
      throw new Error(`Puzzle ${puzzle.id} has invalid solution.`);
    }

    if (!matchesGivens(puzzle.givens, puzzle.solution)) {
      throw new Error(`Puzzle ${puzzle.id} has givens that conflict with the solution.`);
    }

    if (!isSolvedByRules(puzzle.solution)) {
      throw new Error(`Puzzle ${puzzle.id} has an invalid solved grid.`);
    }
  }

  await writeFile(defaultOutputPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  console.log(`Imported ${parsed.length} puzzles into ${defaultOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
