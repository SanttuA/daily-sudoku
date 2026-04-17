import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const fixedPuzzle = {
  givens: '091340678348062910705918034526407189180529407079680523637094850804176092912803746',
  solution: '291345678348762915765918234526437189183529467479681523637294851854176392912853746',
};

test('anonymous progress persists across refresh', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sudoku-board')).toBeVisible();

  await page.getByTestId('cell-0').fill('2');
  await page.reload();

  await expect(page.getByTestId('cell-0')).toHaveValue('2');
});

test('anonymous players cannot submit official scores', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sudoku-board')).toBeVisible();

  await fillSolvedBoard(page);
  await page.getByTestId('submit-score-button').click();

  await expect(
    page.getByText('Sign in before you submit an official leaderboard time.'),
  ).toBeVisible();
});

test('registered players can submit a solve and see it in leaderboard and history', async ({
  page,
}) => {
  await page.goto('/auth/signup');
  const displayNameInput = page.getByLabel('Display name');
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');

  await displayNameInput.focus();
  await page.keyboard.type('Playwright Ace');

  await page.keyboard.press('Tab');
  await expect(emailInput).toBeFocused();
  await page.keyboard.type('playwright@example.com');

  await page.keyboard.press('Tab');
  await expect(passwordInput).toBeFocused();
  await page.keyboard.type('super-secret');

  await expect(displayNameInput).toHaveValue('Playwright Ace');
  await expect(emailInput).toHaveValue('playwright@example.com');
  await expect(passwordInput).toHaveValue('super-secret');

  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('sudoku-board')).toBeVisible();

  await fillSolvedBoard(page);
  await page.getByTestId('submit-score-button').click();

  await expect(page.getByText(/Official time saved/)).toBeVisible();

  await page.goto('/leaderboard');
  await expect(page.getByTestId('leaderboard-list').getByText('Playwright Ace')).toBeVisible();

  await page.goto('/history');
  await expect(page.getByText('variant-7')).toBeVisible();
});

async function fillSolvedBoard(page: Page): Promise<void> {
  for (let index = 0; index < fixedPuzzle.givens.length; index += 1) {
    if (fixedPuzzle.givens[index] !== '0') {
      continue;
    }

    await page.getByTestId(`cell-${index}`).fill(fixedPuzzle.solution[index] ?? '');
  }
}
