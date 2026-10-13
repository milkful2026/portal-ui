/**
 * Inline form validation for the create/edit product form and the
 * category create/edit dialog (MA-157 FR-3/FR-5), checked before submit
 * so a request is never sent with values the backend would reject
 * anyway - same discipline inventoryValidation.ts already established
 * for this console's other admin forms.
 */

/** FR-3: name is required, non-empty. Shared by name/unit, which have
 * the identical "required, non-empty" rule - parameterized by field
 * label rather than duplicated twice. */
export function validateRequiredTextField(value: string, fieldLabel: string): string | null {
  return value.trim() ? null : `${fieldLabel} is required.`;
}

/** FR-3: price B2C must be a positive number (mirrors MA-156 FR-1's own
 * `priceB2c > 0` backend check, so a bad value is caught here rather
 * than round-tripping to the server first). */
export function validatePriceB2cField(value: string): string | null {
  if (!value.trim()) {
    return 'Price (B2C) is required.';
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 'Price (B2C) must be a number.';
  }
  if (parsed <= 0) {
    return 'Price (B2C) must be a positive number.';
  }
  return null;
}

/** FR-3: price B2B, HSN code, and tax rate are all optional - empty is
 * always valid. Only validates shape when a value is actually present. */
export function validateOptionalPriceField(value: string, fieldLabel: string): string | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return `${fieldLabel} must be a number.`;
  }
  if (parsed < 0) {
    return `${fieldLabel} must not be negative.`;
  }
  return null;
}

/** FR-5: category name/icon name are required; sort order (if provided)
 * must be a whole number. */
export function validateCategorySortOrderField(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 'Sort order must be a whole number.';
  }
  return null;
}
