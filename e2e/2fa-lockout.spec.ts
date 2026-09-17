import { test, expect } from '@playwright/test';
import { SUPER_ADMIN } from './helpers';

// Scenario: Admin login fails 2FA five times and is locked out (spec §10)
test('locks out after 5 consecutive failed 2FA attempts', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(SUPER_ADMIN.email);
  await page.getByLabel('Password').fill(SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page.getByLabel('Verification code')).toBeVisible();

  for (let attempt = 1; attempt <= 5; attempt++) {
    await page.getByLabel('Verification code').fill('000000');
    await page.getByRole('button', { name: 'Verify' }).click();

    if (attempt < 5) {
      await expect(page.getByText('Incorrect verification code')).toBeVisible();
    }
  }

  await expect(page.getByText('Account temporarily locked due to too many failed attempts')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
});
