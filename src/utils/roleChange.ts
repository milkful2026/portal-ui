import { AdminRole } from '../api/types';

/**
 * Confirmation-gating logic for FR-4: "changing the role and saving shows a
 * confirmation dialog ... before committing, since this immediately changes
 * their access."
 *
 * A confirmation is required only when the role actually changed. Saving
 * the edit form with the role left unchanged (e.g. only IP/session fields
 * changed) should not prompt a role-change confirmation.
 */
export function requiresRoleChangeConfirmation(previousRole: AdminRole, nextRole: AdminRole): boolean {
  return previousRole !== nextRole;
}

export function roleChangeConfirmationMessage(name: string, previousRole: AdminRole, nextRole: AdminRole): string {
  return `Change ${name}'s role from ${previousRole} to ${nextRole}?`;
}
