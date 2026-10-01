import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Scenario: Bulk action reports partial failure clearly (spec §10's "Bulk
// deactivate reports partial failure clearly").
//
// This test previously bulk-*deactivated* three rows, relying on "Meera
// Nair" (customer-5, seeded already Deactivated) to produce the "1 failed"
// row via the mock wrongly 409ing a deactivate of an already-Deactivated
// account. That was itself a mock bug: MA-139 FR-4 requires deactivate to
// be idempotent (200, unchanged) even when the account is already
// Deactivated — fixed in handlers.ts's resolveCustomerTransition (see
// src/utils/customerTransitions.ts). Deactivate can therefore no longer
// fail via a status-transition rejection for *any* starting status, so a
// "bulk deactivate" call can't genuinely demonstrate a partial failure that
// way any more.
//
// This test now exercises bulk *suspend* instead: "Suresh Babu"
// (customer-6) is seeded already Deactivated (src/mocks/db.ts), and per
// MA-139 FR-3/§9 suspending an already-Deactivated account genuinely is a
// 409 INVALID_STATUS_TRANSITION (the account must be reactivated first) —
// so this row's failure is real, server-side state-machine validation, not
// a UI-only simulation or a mock bug being relied upon.
test('Bulk suspend reports partial failure clearly', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await page.getByRole('link', { name: 'Customer Accounts' }).click();
  await expect(page.getByRole('heading', { name: 'Customer Accounts' })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select Priya Sharma' }).check();
  await page.getByRole('checkbox', { name: 'Select Rohan Enterprises' }).check();
  await page.getByRole('checkbox', { name: 'Select Suresh Babu' }).check();

  await page.getByRole('button', { name: 'Suspend selected' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('Quarterly account review cleanup');
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const until = future.toISOString().slice(0, 10);
  await dialog.getByLabel('Until').fill(until);
  await dialog.getByRole('button', { name: 'Suspend' }).click();

  await expect(dialog.getByText('2 succeeded, 1 failed')).toBeVisible();
  await expect(dialog.getByText('Suresh Babu')).toBeVisible();
  await expect(dialog.getByText('Cannot suspend an account that is already Deactivated.')).toBeVisible();
});
