import { test, expect } from '@playwright/test';
import { registerViaUi, uniqueEmail } from './helpers';

test('5. Delete account via settings UI → redirects to /login', async ({ page }) => {
  const email = uniqueEmail('delete');
  await registerViaUi(page, email, 'Password1!');

  await page.goto('/settings');

  // Open the delete-account confirmation dialog.
  await page.getByRole('button', { name: 'Hesabı Sil' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  // Confirm deletion inside the dialog.
  await dialog.getByRole('button', { name: 'Hesabı Sil' }).click();

  // AuthService.deleteAccount() clears tokens and navigates to /login.
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
});
