import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Scenario: Ops admin deactivates a customer account (spec §10)
test('Ops admin deactivates a customer account', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await page.getByRole('link', { name: 'Customer Accounts' }).click();
  await expect(page.getByRole('heading', { name: 'Customer Accounts' })).toBeVisible();

  await page.getByLabel('Search').fill('Priya Sharma');
  const row = page.getByRole('row', { name: /Priya Sharma/ });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Actions for Priya Sharma' }).click();
  await page.getByRole('menuitem', { name: 'Deactivate' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('Customer requested account closure');
  await dialog.getByRole('button', { name: 'Deactivate' }).click();

  await expect(page.getByText('Priya Sharma deactivated.')).toBeVisible();
  await expect(row.getByText('Deactivated', { exact: true })).toBeVisible();
});
