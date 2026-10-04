import { test, expect } from '@playwright/test';
import { loginAs, FINANCE_ADMIN } from './helpers';

// Scenario: Non-Ops, non-SuperAdmin cannot see Inventory (spec section 10)
test('Finance admin does not see Inventory nav and is redirected on direct URL access', async ({ page }) => {
  await loginAs(page, FINANCE_ADMIN);
  await expect(page.getByText('Signed in as Finance.')).toBeVisible();

  await expect(page.getByRole('link', { name: 'Inventory' })).toHaveCount(0);

  await page.goto('/inventory');
  await expect(page.getByRole('heading', { name: '403 — Permission denied' })).toBeVisible();
});