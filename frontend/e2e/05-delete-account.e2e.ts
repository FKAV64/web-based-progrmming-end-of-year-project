import { test, expect } from '@playwright/test';
import { BACKEND_API, uniqueEmail } from './helpers';

/**
 * NOTE: The settings page does not currently expose a delete-account button,
 * even though the backend ships a DELETE /me endpoint. That UI gap is tracked
 * separately. This test exercises the deletion path through the same API the
 * eventual UI would call, then asserts /me returns 401 — which is the actual
 * acceptance criterion in the plan.
 */
test('5. Delete account → /me returns 401 afterwards', async ({ request }) => {
  // Bootstrap: hit /auth/csrf to receive the XSRF-TOKEN cookie before any
  // mutating call. Then register via API (response body holds the access token).
  const csrfPing = await request.get(`${BACKEND_API}/health`, { failOnStatusCode: false });
  expect(csrfPing.status(), 'health check').toBeLessThan(500);

  const cookieJar = await request.storageState();
  const xsrfCookieEntry = cookieJar.cookies.find(c => c.name === 'XSRF-TOKEN');
  expect(xsrfCookieEntry, 'XSRF-TOKEN cookie should be issued by the backend').toBeTruthy();
  const xsrfToken = xsrfCookieEntry!.value;

  const email = uniqueEmail('delete');
  const registerResp = await request.post(`${BACKEND_API}/auth/register`, {
    headers: { 'x-xsrf-token': xsrfToken },
    data: { email, password: 'Password1!', name: 'E2E Delete' },
    failOnStatusCode: false,
  });
  expect(registerResp.status(), `register failed: ${await registerResp.text()}`).toBe(201);
  const { data: registerBody } = await registerResp.json();
  const accessToken = registerBody.accessToken;
  expect(accessToken, 'register should return an access token').toBeTruthy();

  // /me with the fresh token must succeed (sanity check).
  const meBeforeResp = await request.get(`${BACKEND_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    failOnStatusCode: false,
  });
  expect(meBeforeResp.status()).toBe(200);

  // Delete the account.
  const deleteResp = await request.delete(`${BACKEND_API}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-xsrf-token': xsrfToken,
    },
    failOnStatusCode: false,
  });
  expect([200, 204]).toContain(deleteResp.status());

  // After deletion, /me must respond 401 — the (still-formally-valid) JWT now
  // points at a deleted user, so the JwtStrategy's user lookup must reject it.
  const meAfterResp = await request.get(`${BACKEND_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    failOnStatusCode: false,
  });
  expect(meAfterResp.status()).toBe(401);
});
