import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Scenario: Ops admin creates a new product (spec section 10)
test('Ops admin creates a new product', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await page.getByRole('link', { name: 'Catalog' }).click();
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();

  await page.getByRole('button', { name: 'New Product' }).click();
  await expect(page.getByRole('heading', { name: 'New Product' })).toBeVisible();

  await page.getByLabel('Name').fill('Paneer Cubes');
  await page.getByLabel('Category').click();
  await page.getByRole('option', { name: 'Fresh Milk' }).click();
  await page.getByLabel('Unit').fill('200g Pack');
  await page.getByLabel('Price (B2C)').fill('75');

  await page.getByRole('button', { name: 'Create' }).click();

  // Toast confirms creation; navigated to the new product's detail page
  // showing the entered values.
  await expect(page.getByText('Product Paneer Cubes created.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Paneer Cubes' })).toBeVisible();
  await expect(page.getByLabel('Unit')).toHaveValue('200g Pack');
  await expect(page.getByLabel('Price (B2C)')).toHaveValue('75');
});
