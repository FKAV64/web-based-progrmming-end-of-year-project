import { APIRequestContext, Page, expect } from '@playwright/test';

export const BACKEND_API = process.env['E2E_BACKEND_API'] ?? 'http://localhost:3000/api';

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Seed the dev market data through the dev controller so /markets renders even
 * when the test runner cannot reach api.coingecko.com.
 */
export async function seedMarketData(request: APIRequestContext): Promise<void> {
  try {
    await request.post(`${BACKEND_API}/dev/seed-market-data`, { failOnStatusCode: false });
  } catch {
    // dev endpoint absent in non-dev builds — tests can still proceed.
  }
}

export async function registerViaUi(
  page: Page,
  email: string,
  password: string,
  name = 'E2E Test User',
): Promise<void> {
  await page.goto('/register');
  // Use role + exact name so we don't collide with the "Şifreyi göster" toggle button.
  await page.getByRole('textbox', { name: 'Ad Soyad' }).fill(name);
  await page.getByRole('textbox', { name: 'E-posta' }).fill(email);
  await page.getByRole('textbox', { name: 'Şifre', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Kayıt Ol' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'E-posta' }).fill(email);
  await page.getByRole('textbox', { name: 'Şifre', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}
