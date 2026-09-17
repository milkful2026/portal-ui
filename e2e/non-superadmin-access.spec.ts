import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Scenario: Non-Super-Admin cannot see Admin Users (spec §10)
test('Ops admin does not see Admin Users nav and is redirected on direct URL access', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await expect(page.getByText('Signed in as Ops.')).toBeVisible();

  await expect(page.getByRole('link', { name: 'Admin Users' })).toHaveCount(0);

  await page.goto('/admin-users');
  await expect(page.getByRole('heading', { name: '403 — Permission denied' })).toBeVisible();
});
