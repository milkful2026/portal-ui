/**
 * Inline form validation for the Adjust and Receive Stock dialogs
 * (MA-151 FR-4/FR-5), checked before submit so a request is never sent
 * with values the backend would reject anyway - same "same pattern as
 * MA-128's CIDR validation" discipline futureDate.ts's own docstring
 * cites, applied to inventory's own fields.
 */

/** FR-4: a signed, non-zero whole number ("positive to add, negative to
 * remove/report spoilage"). Zero is rejected - it is never a meaningful
 * adjustment and would otherwise silently create a no-op audit row. */
export function validateQuantityDeltaField(value: string): string | null {
  if (!value.trim()) {
    return 'Quantity is required.';
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 'Quantity must be a whole number.';
  }
  if (parsed === 0) {
    return 'Quantity must not be zero.';
  }
  return null;
}

/** FR-4: Reason is required for every adjustment (distinct from Receive's
 * optional reason/note, FR-5). */
export function validateReasonField(value: string): string | null {
  return value.trim() ? null : 'Reason is required.';
}