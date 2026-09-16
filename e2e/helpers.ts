import { Page, expect } from '@playwright/test';

export const SUPER_ADMIN = { email: 'superadmin@milkful.test', password: 'Passw0rd!' };
export const OPS_ADMIN = { email: 'ops@milkful.test', password: 'Passw0rd!' };
export const MOCK_TOTP_CODE = '123456';

export async function loginAs(page: Page, creds: { email: string; password: string }, code = MOCK_TOTP_CODE) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page.getByLabel('Verification code')).toBeVisible();
  await page.getByLabel('Verification code').fill(code);
  await page.getByRole('button', { name: 'Verify' }).click();
}
