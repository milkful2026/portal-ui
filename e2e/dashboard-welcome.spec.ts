import { test, expect } from '@playwright/test';
import { loginAs, SUPER_ADMIN } from './helpers';

// Regression test: AuthContext previously derived `user` (and therefore
// the Dashboard's "Welcome, {email}" text) from the access token. Real
// Cognito access tokens never carry an `email` claim (confirmed against
// the real backend) — only ID tokens do, per standard OIDC identity vs.
// authorization token separation — so against the real backend this
// always rendered "Welcome, undefined". The mock previously put `email`
// on both tokens it built, which is exactly why no mocked test caught
// this; buildMockJwt/handlers.ts now omit it from the access token too,
// matching the real contract, so this test has real teeth.
test('Dashboard shows the signed-in admin\'s actual email, not "undefined"', async ({ page }) => {
  await loginAs(page, SUPER_ADMIN);

  await expect(page.getByText(`Welcome, ${SUPER_ADMIN.email}`)).toBeVisible();
  await expect(page.getByText('undefined')).toHaveCount(0);
});
