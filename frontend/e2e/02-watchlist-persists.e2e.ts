import { test, expect } from '@playwright/test';
import { registerViaUi, seedMarketData, uniqueEmail } from './helpers';

test('2. Login + add coin to watchlist + reload → still there', async ({ page, request }) => {
  await seedMarketData(request);

  const email = uniqueEmail('watch');
  await registerViaUi(page, email, 'Password1!');

  // Navigate to /markets and toggle a coin into the watchlist.
  await page.goto('/markets');
  // Wait for the markets table to populate (seeded fixture has 20 coins).
  await expect(page.locator('table tr.mat-mdc-row').first()).toBeVisible({ timeout: 20_000 });

  // The price stream throttles ticks every 250 ms, so the mat-table re-renders
  // its rows and detaches the watchlist button mid-click. Use the role-based
  // locator + dispatchEvent to bypass actionability/visibility checks.
  const firstToggle = page.getByRole('button', { name: 'İzleme listesine ekle' }).first();
  await firstToggle.dispatchEvent('click');

  // Reload and visit the watchlist page — entry must persist.
  await page.reload();
  await page.goto('/watchlist');

  // The watchlist page should show at least one row.
  await expect(page.locator('table tr.mat-mdc-row, [data-testid="watchlist-row"]').first()).toBeVisible({ timeout: 15_000 });
});
