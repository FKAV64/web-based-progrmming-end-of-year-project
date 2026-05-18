import { test, expect } from '@playwright/test';
import { registerViaUi, uniqueEmail } from './helpers';

test('1. Register lands on the dashboard', async ({ page }) => {
  const email = uniqueEmail('register');
  await registerViaUi(page, email, 'Password1!');

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeVisible();
});
