import { test, expect } from '@playwright/test';
import { registerViaUi, seedMarketData, uniqueEmail, BACKEND_API } from './helpers';

test('4. Create alert at price below current → backend triggers it within ~35 s', async ({ page, request }) => {
  // Backend exchange-rate fetch retries 3× before falling back to dev rates,
  // so triggering takes ~5 s. Allow generous headroom on the whole test.
  test.setTimeout(90_000);
  await seedMarketData(request);

  const email = uniqueEmail('alert');
  await registerViaUi(page, email, 'Password1!');

  // Browser notification permission must be granted up-front so PushService toggles cleanly.
  await page.context().grantPermissions(['notifications']);

  await page.goto('/alerts');
  await page.getByRole('button', { name: 'Yeni Alarm' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  // Coin ID is a free-text input; condition is mat-select; target is a numeric input.
  await dialog.getByRole('textbox', { name: 'Coin ID' }).fill('bitcoin');

  // Set condition = "Ustunde" (ABOVE). Seeded BTC = $78,000 → alert with target=1 will
  // fire on the very next snapshot evaluation because 78,000 > 1 (price already above).
  await dialog.getByRole('combobox', { name: 'Kosul' }).click();
  await page.getByRole('option', { name: 'Ustunde' }).click();

  await dialog.getByRole('textbox', { name: 'Hedef Fiyat' }).fill('1');

  await dialog.getByRole('button', { name: 'Alarmi Olustur' }).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });

  // Active tab should display the new alert (article rendered in the active tabpanel).
  const activePanel = page.getByRole('tabpanel', { name: 'Aktif' });
  await expect(activePanel.locator('article').first()).toBeVisible({ timeout: 10_000 });

  // Force a snapshot evaluation via the dev controller — this fires the alert.
  // The evaluator retries CoinGecko 3× before falling back, so triggering takes ~5 s.
  await request.post(`${BACKEND_API}/dev/trigger-snapshot`, { failOnStatusCode: false });

  // NOTE: AlertsService.loadTriggered() gates on a `triggeredLoaded` flag, so
  // bouncing the tab does not refresh the list once the first call has run.
  // (Real bug — flagged separately, will be fixed outside Phase 18.) Reloading
  // the page is the user-facing workaround and what we use here in the test.
  await expect(async () => {
    await page.reload();
    await page.getByRole('tab', { name: 'Tetiklenen' }).click();
    await expect(
      page.getByRole('tabpanel').locator('article').first(),
    ).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 35_000, intervals: [3_000] });
});
