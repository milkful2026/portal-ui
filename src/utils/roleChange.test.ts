import { describe, expect, it } from 'vitest';
import { requiresRoleChangeConfirmation, roleChangeConfirmationMessage } from './roleChange';

describe('requiresRoleChangeConfirmation', () => {
  it('requires confirmation when the role differs', () => {
    expect(requiresRoleChangeConfirmation('Ops', 'Finance')).toBe(true);
  });

  it('does not require confirmation when the role is unchanged', () => {
    expect(requiresRoleChangeConfirmation('Ops', 'Ops')).toBe(false);
  });
});

describe('roleChangeConfirmationMessage', () => {
  it('renders the exact copy from FR-4', () => {
    expect(roleChangeConfirmationMessage('Jane Doe', 'Ops', 'Finance')).toBe(
      "Change Jane Doe's role from Ops to Finance?",
    );
  });
});
