import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Scenario: Deactivating a product requires confirmation and hides it
// from the Catalog list's default (Active) filter (spec section 10)
test('Deactivating a product requires confirmation and hides it from the active filter', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await page.getByRole('link', { name: 'Catalog' }).click();

  await page.getByRole('link', { name: 'Cow Milk' }).click();
  await expect(page.getByRole('heading', { name: 'Cow Milk' })).toBeVisible();

  await page.getByRole('switch', { name: 'Active' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Reason').fill('Discontinued by supplier');
  await dialog.getByRole('button', { name: 'Deactivate' }).click();

  // Toast confirms deactivation; the Active badge now reads Inactive;
  // the product still resolves at its own URL (not 404).
  await expect(page.getByText('Cow Milk has been deactivated.')).toBeVisible();
  await expect(page.getByText('Inactive')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cow Milk' })).toBeVisible();

  // No longer appears in the Catalog list's default (Active) filter.
  await page.getByRole('link', { name: 'Back to Catalog' }).click();
  await expect(page.getByRole('cell', { name: 'Cow Milk' })).toHaveCount(0);

  // Still visible under the Inactive filter - FR-2's "never hidden from
  // the admin's own list" requirement.
  await page.getByLabel('Status').click();
  await page.getByRole('option', { name: 'Inactive', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Cow Milk' })).toBeVisible();
});
