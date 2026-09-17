/**
 * Validation for the Max Concurrent Sessions field (FR-5).
 *
 * Empty means "unlimited" (maps to `null` on the wire). `0` is a valid,
 * deliberate value — "no sessions allowed", used to hard-lock an admin
 * out without deactivating them (see the corresponding fix in
 * services/identity-auth's admin_session_registry.py, which previously
 * treated 0 the same as unlimited via a falsy check) — so 0 must not
 * be rejected here. Only a negative number or a non-integer is
 * invalid. Previously this field had no validation at all: native HTML
 * validation was disabled (`noValidate` on the form) and neither
 * submit handler checked it before sending, so `0`, a negative number,
 * or non-numeric leftover input could all reach the API unvalidated.
 */
export function validateMaxSessionsField(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) {
    return 'Must be a whole number, 0 or greater.';
  }
  return null;
}

/** Returns `null` for "unlimited", otherwise the parsed integer.
 * Callers must run `validateMaxSessionsField` first — this does not
 * itself guard against invalid input. */
export function parseMaxSessions(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  return Number(trimmed);
}
