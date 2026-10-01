/**
 * Validation for Suspend's required "Until" date field (FR-4): must be
 * present and a future date, checked inline before submit — same pattern
 * as AdminFormDialog's CIDR field (validateCidrField), per spec §9's
 * "same pattern as MA-128's CIDR validation" edge case.
 *
 * Dates are plain `YYYY-MM-DD` values from an HTML date input. Comparison
 * is against the start of today (local time) so "today" itself does not
 * count as a future date — an admin suspending "until today" would have
 * the suspension expire immediately, which is never the intent of this
 * field.
 */

export function isFutureDate(value: string): boolean {
  if (!value) return false;
  const entered = new Date(`${value}T00:00:00`);
  if (Number.isNaN(entered.getTime())) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return entered.getTime() > startOfToday.getTime();
}

/** Returns an inline validation error message, or null if the field is valid. */
export function validateUntilField(value: string): string | null {
  if (!value.trim()) {
    return 'An end date is required.';
  }
  if (!isFutureDate(value)) {
    return 'Must be a future date.';
  }
  return null;
}
