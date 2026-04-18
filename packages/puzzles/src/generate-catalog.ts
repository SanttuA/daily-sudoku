import { generateCatalogFiles } from './generator';

type ParsedGenerateArgs = {
  daysAhead: number;
  preserveThrough?: string;
  seed?: string;
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await generateCatalogFiles(args);

  console.log(
    [
      `Generated ${result.createdPuzzleCount} new puzzles.`,
      `Added ${result.createdScheduleCount} schedule entries.`,
      `Catalog size: ${result.catalogCount}.`,
      `Schedule coverage: ${result.preserveThrough} through ${result.scheduledThrough}.`,
    ].join(' '),
  );
}

function parseArgs(argv: string[]): ParsedGenerateArgs {
  const parsed: Partial<ParsedGenerateArgs> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token) {
      continue;
    }

    if (token === '--days-ahead') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Expected a value after --days-ahead.');
      }

      parsed.daysAhead = Number.parseInt(value, 10);
      index += 1;
      continue;
    }

    if (token.startsWith('--days-ahead=')) {
      parsed.daysAhead = Number.parseInt(token.slice('--days-ahead='.length), 10);
      continue;
    }

    if (token === '--seed') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Expected a value after --seed.');
      }

      parsed.seed = value;
      index += 1;
      continue;
    }

    if (token.startsWith('--seed=')) {
      parsed.seed = token.slice('--seed='.length);
      continue;
    }

    if (token === '--preserve-through') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Expected a value after --preserve-through.');
      }

      parsed.preserveThrough = value;
      index += 1;
      continue;
    }

    if (token.startsWith('--preserve-through=')) {
      parsed.preserveThrough = token.slice('--preserve-through='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (parsed.daysAhead === undefined) {
    throw new Error(
      'Usage: npm run puzzles:generate -- --days-ahead 365 [--seed value] [--preserve-through YYYY-MM-DD]',
    );
  }

  return parsed as ParsedGenerateArgs;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
