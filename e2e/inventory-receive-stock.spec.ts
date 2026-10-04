import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Scenario: Ops admin records a goods receipt (spec section 10)
test('Ops admin records a goods receipt', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);
  await page.getByRole('link', { name: 'Inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();

  await page.getByRole('link', { name: 'product-1' }).click();
  await expect(page.getByRole('heading', { name: 'product-1' })).toBeVisible();

  await page.getByRole('button', { name: 'Receive Stock' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Quantity').fill('50');
  await dialog.getByLabel('Expiry Date').fill('2026-12-25');
  await dialog.getByRole('button', { name: 'Receive' }).click();

  // Toast confirms the receipt.
  await expect(page.getByText('50 units received for product-1, expiring 2026-12-25.')).toBeVisible();

  // The aggregate "On Hand" number increases by the received quantity
  // (product-1 seeds at on_hand=500, so 500 + 50 = 550). Scoped to the
  // h5 stat specifically - '550' alone can also appear elsewhere (e.g.
  // the audit trail's "New On Hand" column), and MUI's Typography
  // variant="h5" renders as a real <h5> (heading role, level 5).
  await expect(page.getByRole('heading', { level: 5, name: '550' })).toBeVisible();

  // The new batch row appears in the batch table with the entered
  // quantity (no pre-existing product-1 batch has quantity 50).
  const batchTable = page.getByRole('table', { name: 'Batches' });
  await expect(batchTable.getByRole('cell', { name: '50', exact: true })).toBeVisible();
});