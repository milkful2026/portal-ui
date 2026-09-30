import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Scenario: Bulk deactivate reports partial failure clearly (spec §10).
// "Meera Nair" (customer-5) is seeded already Deactivated (see
// src/mocks/db.ts), so the mock's server-side state-machine validation
// (FR-4's three-state machine, enforced in handlers.ts) genuinely rejects
// that one row with 409 INVALID_STATUS_TRANSITION — this isn't a UI-only
// simulation of failure.
test('Bulk deactivate reports partial failure clearly', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await page.getByRole('link', { name: 'Customer Accounts' }).click();
  await expect(page.getByRole('heading', { name: 'Customer Accounts' })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select Priya Sharma' }).check();
  await page.getByRole('checkbox', { name: 'Select Rohan Enterprises' }).check();
  await page.getByRole('checkbox', { name: 'Select Meera Nair' }).check();

  await page.getByRole('button', { name: 'Deactivate selected' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('Quarterly account review cleanup');
  await dialog.getByRole('button', { name: 'Deactivate' }).click();

  await expect(dialog.getByText('2 succeeded, 1 failed')).toBeVisible();
  await expect(dialog.getByText('Meera Nair')).toBeVisible();
  await expect(dialog.getByText('This account is already Deactivated.')).toBeVisible();
});
