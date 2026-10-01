import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Regression test: canceling the bulk action dialog used to unconditionally
// clear the whole row selection (CustomerAccountsPage.tsx's closeBulkDialog
// cleared `selected` no matter how the dialog closed), forcing an admin to
// redo their checkbox selection after a plain Cancel click. The selection
// must only be cleared once a bulk action actually completes.
test('Canceling the bulk action dialog preserves the current selection', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await page.getByRole('link', { name: 'Customer Accounts' }).click();
  await expect(page.getByRole('heading', { name: 'Customer Accounts' })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select Priya Sharma' }).check();
  await page.getByRole('checkbox', { name: 'Select Rohan Enterprises' }).check();
  await expect(page.getByText('2 selected')).toBeVisible();

  await page.getByRole('button', { name: 'Deactivate selected' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();

  // Selection survives the cancel — no request was ever sent.
  await expect(page.getByText('2 selected')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Select Priya Sharma' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Select Rohan Enterprises' })).toBeChecked();

  // A bulk action that actually completes successfully still clears the
  // (succeeded) selection afterwards.
  await page.getByRole('button', { name: 'Deactivate selected' }).click();
  await dialog.getByLabel('Reason').fill('Quarterly account review cleanup');
  await dialog.getByRole('button', { name: 'Deactivate' }).click();
  await expect(dialog.getByText('2 succeeded, 0 failed')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('2 selected')).toHaveCount(0);
});
