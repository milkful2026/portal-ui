import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Regression test: CustomerDetailPage previously read `customer.history`,
// but the real User Service response field is `statusHistory` (confirmed
// live against the backend — the spec's own §7 example used `history`,
// which the shipped backend implementation didn't match). The mismatch
// never surfaced in any mocked test because the mock was built from the
// same (wrong) field name as the component itself, so both agreed with
// each other while disagreeing with reality. `statusHistory` is now the
// field name throughout (types, component, mock) to match the real
// backend, and this test exercises the page that actually renders it —
// no prior e2e test navigated to this route at all.
test("Customer detail page shows the account's status history, not a blank page", async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await page.getByRole('link', { name: 'Customer Accounts' }).click();

  await page.getByLabel('Search').fill('Meera Nair');
  const row = page.getByRole('row', { name: /Meera Nair/ });
  await row.getByRole('button', { name: 'Actions for Meera Nair' }).click();
  await page.getByRole('menuitem', { name: 'View Details' }).click();

  await expect(page.getByRole('heading', { name: 'Meera Nair' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Status History' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Customer requested account closure' })).toBeVisible();
});
