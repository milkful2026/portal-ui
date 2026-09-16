import { test, expect } from '@playwright/test';
import { loginAs, SUPER_ADMIN } from './helpers';

// Scenario: Super-Admin creates a new admin account (spec §10)
test('Super-Admin creates a new admin account', async ({ page }) => {
  await loginAs(page, SUPER_ADMIN);
  await page.getByRole('link', { name: 'Admin Users' }).click();
  await expect(page.getByRole('heading', { name: 'Admin Users' })).toBeVisible();

  await page.getByRole('button', { name: 'Add Admin' }).click();

  const dialog = page.getByRole('dialog');
  const email = `new.finance.${Date.now()}@milkful.test`;
  await dialog.getByLabel('Name').fill('New Finance Admin');
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Role').click();
  await page.getByRole('option', { name: 'Finance' }).click();

  await dialog.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText(`Admin account created. An invitation has been sent to ${email}.`)).toBeVisible();

  const row = page.getByRole('row', { name: new RegExp(email) });
  await expect(row).toBeVisible();
  await expect(row.getByRole('cell', { name: 'Finance', exact: true })).toBeVisible();
  await expect(row.getByText('Pending', { exact: true })).toBeVisible();
});
