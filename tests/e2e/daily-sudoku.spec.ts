import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const fixedPuzzle = {
  givens: '091340678348062910705918034526407189180529407079680523637094850804176092912803746',
  solution: '291345678348762915765918234526437189183529467479681523637294851854176392912853746',
};

test('anonymous progress persists across refresh', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('sudoku-board')).toBeVisible();

  await page.getByTestId('cell-0').fill('2');
  await page.reload();

  await expect(page.getByTestId('cell-0')).toHaveValue('2');
});

test('anonymous players cannot submit official scores', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('sudoku-board')).toBeVisible();

  await fillSolvedBoard(page);
  await page.getByTestId('submit-score-button').click();

  await expect(
    page.getByText('Sign in before you submit an official leaderboard time.'),
  ).toBeVisible();
});

test('home page stays focused on landing content and routes into play', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: /play today/i })).toBeVisible();
  await expect(page.getByTestId('sudoku-board')).toHaveCount(0);
});

test('theme preference persists across reloads and route changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByTestId('theme-toggle')).toContainText('Dark mode');

  await page.getByTestId('theme-toggle').click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('theme-toggle')).toContainText('Light mode');

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('theme-toggle')).toContainText('Light mode');

  await page.goto('/play');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.goto('/leaderboard');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('registered players can submit a solve and see it in leaderboard and history', async ({
  page,
}) => {
  await signUp(page, {
    displayName: 'Playwright Ace',
    email: buildUniqueEmail('playwright'),
    password: 'super-secret',
  });

  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByTestId('sudoku-board')).toBeVisible();

  await fillSolvedBoard(page);
  await page.getByTestId('submit-score-button').click();

  await expect(page.getByText(/Official time saved/)).toBeVisible();

  await page.goto('/leaderboard');
  await expect(page.getByTestId('leaderboard-list').getByText('Playwright Ace')).toBeVisible();

  await page.goto('/history');
  await expect(page.getByText('variant-7')).toBeVisible();
});

test('signed-in users can log out without API errors', async ({ page }) => {
  await signUp(page, {
    displayName: 'Logout Ace',
    email: buildUniqueEmail('logout'),
    password: 'super-secret',
  });

  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByText('Logout Ace', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

  const logoutResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/auth/logout') && response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: 'Log out' }).click();

  const logoutResponse = await logoutResponsePromise;
  expect(logoutResponse.status()).toBe(204);

  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out' })).toHaveCount(0);
  await expect(page.getByText('Logout Ace', { exact: true })).toHaveCount(0);
});

async function signUp(
  page: Page,
  input: { displayName: string; email: string; password: string },
): Promise<void> {
  await page.goto('/auth/signup');
  const displayNameInput = page.getByLabel('Display name');
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');

  await displayNameInput.focus();
  await page.keyboard.type(input.displayName);

  await page.keyboard.press('Tab');
  await expect(emailInput).toBeFocused();
  await page.keyboard.type(input.email);

  await page.keyboard.press('Tab');
  await expect(passwordInput).toBeFocused();
  await page.keyboard.type(input.password);

  await expect(displayNameInput).toHaveValue(input.displayName);
  await expect(emailInput).toHaveValue(input.email);
  await expect(passwordInput).toHaveValue(input.password);

  await page.getByRole('button', { name: 'Create account' }).click();
}

async function fillSolvedBoard(page: Page): Promise<void> {
  for (let index = 0; index < fixedPuzzle.givens.length; index += 1) {
    if (fixedPuzzle.givens[index] !== '0') {
      continue;
    }

    await page.getByTestId(`cell-${index}`).fill(fixedPuzzle.solution[index] ?? '');
  }
}

function buildUniqueEmail(prefix: string): string {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${uniqueSuffix}@example.com`;
}
