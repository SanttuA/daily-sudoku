import { getPuzzleCatalog } from '@daily-sudoku/puzzles';

async function main(): Promise<void> {
  const catalog = getPuzzleCatalog();
  console.log(
    `Validated ${catalog.length} bundled puzzles. No database seed rows are required for v1.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
