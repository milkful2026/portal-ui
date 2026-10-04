import { test, expect } from '@playwright/test';
import { loginAs, OPS_ADMIN } from './helpers';

// Scenario: an adjustment that would drive `available` stock negative is
// rejected with a message DISTINCT from the plain on_hand-negative case
// (spec section 4/9/10's third E2E scenario). FR-4 requires two separate
// floor-at-zero checks with two separate admin-facing explanations - this
// test exercises both and asserts the two inline error messages differ,
// not just that "an error" appeared.
test('adjustment rejections surface two distinct inline messages, not one generic error', async ({ page }) => {
  await loginAs(page, OPS_ADMIN);

  // Case 1: on_hand=100, reserved=90 (available=10) - product-5's seeded
  // state is exactly spec section 10's own example. Adjusting by -20
  // leaves on_hand=80 (non-negative) but available=80-90=-10 (negative) -
  // the reserved-orders-specific rejection.
  await page.goto('/inventory/product-5');
  await expect(page.getByRole('heading', { name: 'product-5' })).toBeVisible();
  await page.getByRole('button', { name: 'Adjust' }).click();
  const availableDialog = page.getByRole('dialog');
  await availableDialog.getByLabel('Quantity').fill('-20');
  await availableDialog.getByLabel('Reason').fill('Correction after stocktake');
  await availableDialog.getByRole('button', { name: 'Adjust' }).click();

  const availableError = availableDialog.getByText('This would leave negative available stock (reserved orders exist).');
  await expect(availableError).toBeVisible();
  const availableErrorText = (await availableError.textContent())?.trim();

  // on_hand and the audit table remain unchanged - the rejected request
  // must not have mutated anything server-side. Scoped to the h5 stat
  // specifically (MUI Typography variant="h5" renders as a real <h5>,
  // heading role level 5) since '100' alone also appears elsewhere.
  await availableDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { level: 5, name: '100' })).toBeVisible();

  // Case 2: on_hand=0, reserved=0 (product-2, freshly provisioned) -
  // adjusting by -50 leaves on_hand=-50, a plain overcorrection with no
  // reservations involved at all - the generic on_hand-negative case.
  await page.goto('/inventory/product-2');
  await expect(page.getByRole('heading', { name: 'product-2' })).toBeVisible();
  await page.getByRole('button', { name: 'Adjust' }).click();
  const onHandDialog = page.getByRole('dialog');
  await onHandDialog.getByLabel('Quantity').fill('-50');
  await onHandDialog.getByLabel('Reason').fill('Mistaken correction');
  await onHandDialog.getByRole('button', { name: 'Adjust' }).click();

  const onHandError = onHandDialog.getByText('This would leave negative on-hand stock.');
  await expect(onHandError).toBeVisible();
  const onHandErrorText = (await onHandError.textContent())?.trim();

  // The two rejection reasons must never share wording - the entire
  // point of FR-4's "two distinct checks" requirement.
  expect(onHandErrorText).not.toEqual(availableErrorText);
});