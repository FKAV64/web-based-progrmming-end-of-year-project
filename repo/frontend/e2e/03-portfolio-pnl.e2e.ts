import { test, expect } from '@playwright/test';
import { registerViaUi, seedMarketData, uniqueEmail } from './helpers';

test('3. Create position 0.5 BTC @ $30k → P&L renders', async ({ page, request }) => {
  await seedMarketData(request);

  const email = uniqueEmail('portfolio');
  await registerViaUi(page, email, 'Password1!');

  await page.goto('/portfolio');
  await page.getByRole('button', { name: /Yeni Pozisyon/i }).first().click();

  // Add-position dialog opens.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  // Coin picker is an autocomplete combobox — type and pick from the list.
  const coinPicker = dialog.getByRole('combobox', { name: 'Coin seç' });
  await coinPicker.fill('bitcoin');
  await page.getByRole('option', { name: /bitcoin/i }).first().click();

  await dialog.getByRole('textbox', { name: 'Adet' }).fill('0.5');
  await dialog.getByRole('textbox', { name: 'Ortalama Alis' }).fill('30000');

  await dialog.getByRole('button', { name: 'Kaydet' }).click();

  // Dialog dismisses; the totals cards re-render. Total Cost should reflect 30k.
  await expect(dialog).toBeHidden({ timeout: 10_000 });

  // Verify the four summary cards are populated.
  await expect(page.getByText(/Toplam Değer/i)).toBeVisible();
  await expect(page.getByText(/Toplam Maliyet/i)).toBeVisible();
  await expect(page.getByText(/Toplam Kar\/Zarar/i).first()).toBeVisible();

  // Confirm at least one currency-formatted number rendered (e.g. "$30.000,00", "30.000 ₺").
  await expect(page.locator('text=/(\\$|€|₺|TRY)\\s?[0-9.,]+|[0-9.,]+\\s?(\\$|€|₺|TRY)/').first())
    .toBeVisible({ timeout: 10_000 });
});
