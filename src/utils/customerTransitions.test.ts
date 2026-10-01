import { describe, expect, it } from 'vitest';
import { resolveCustomerTransition } from './customerTransitions';

describe('resolveCustomerTransition', () => {
  // Suspend (FR-3)
  it('applies suspend on an Active account', () => {
    expect(resolveCustomerTransition('suspend', 'Active')).toEqual({ kind: 'apply' });
  });

  it('applies (updates, not a no-op) re-suspend on an already-Suspended account', () => {
    expect(resolveCustomerTransition('suspend', 'Suspended')).toEqual({ kind: 'apply' });
  });

  it('errors (409) suspending an already-Deactivated account', () => {
    const result = resolveCustomerTransition('suspend', 'Deactivated');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/already Deactivated/);
    }
  });

  // Deactivate (FR-4)
  it('applies deactivate on an Active account', () => {
    expect(resolveCustomerTransition('deactivate', 'Active')).toEqual({ kind: 'apply' });
  });

  it('applies deactivate on a Suspended account (Deactivated supersedes Suspended)', () => {
    expect(resolveCustomerTransition('deactivate', 'Suspended')).toEqual({ kind: 'apply' });
  });

  it('no-ops (idempotent 200, not an error) deactivating an already-Deactivated account', () => {
    expect(resolveCustomerTransition('deactivate', 'Deactivated')).toEqual({ kind: 'noop' });
  });

  // Reactivate (FR-5)
  it('no-ops (idempotent 200) reactivating an already-Active account', () => {
    expect(resolveCustomerTransition('reactivate', 'Active')).toEqual({ kind: 'noop' });
  });

  it('applies reactivate on a Suspended account', () => {
    expect(resolveCustomerTransition('reactivate', 'Suspended')).toEqual({ kind: 'apply' });
  });

  it('applies reactivate on a Deactivated account (no 409 case for reactivate)', () => {
    expect(resolveCustomerTransition('reactivate', 'Deactivated')).toEqual({ kind: 'apply' });
  });
});