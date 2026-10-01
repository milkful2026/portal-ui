/**
 * Server-side (mock) status-transition rules for Customer Accounts -
 * MA-139 FR-3 (Suspend) / FR-4 (Deactivate) / FR-5 (Reactivate) and section 9's
 * edge-case table. Pulled out as a pure function, mirroring
 * customerStatusActions.ts's pattern, so the mock's transition logic has
 * its own unit tests instead of only being exercised indirectly through
 * HTTP handlers.
 *
 * The five rules (section 9, plus FR-3/FR-4/FR-5's own text):
 *  - Suspend on Active            -> apply (normal suspend)
 *  - Suspend on Suspended         -> apply (re-suspend updates until/reason;
 *                                    NOT an idempotent no-op, unlike Deactivate)
 *  - Suspend on Deactivated       -> error (409 INVALID_STATUS_TRANSITION;
 *                                    must reactivate first)
 *  - Deactivate on Active         -> apply
 *  - Deactivate on Suspended      -> apply (Deactivated supersedes Suspended)
 *  - Deactivate on Deactivated    -> no-op (200, unchanged, idempotent - FR-4;
 *                                    this endpoint never returns 409)
 *  - Reactivate on Active         -> no-op (200, unchanged, idempotent)
 *  - Reactivate on Suspended      -> apply
 *  - Reactivate on Deactivated    -> apply (FR-5 defines no 409 case at all)
 */

import { BulkCustomerAction, CustomerStatus } from '../api/types';

export type CustomerTransitionOutcome =
  | { kind: 'apply' }
  | { kind: 'noop' }
  | { kind: 'error'; message: string };

export function resolveCustomerTransition(
  action: BulkCustomerAction,
  current: CustomerStatus,
): CustomerTransitionOutcome {
  if (action === 'suspend') {
    if (current === 'Deactivated') {
      return { kind: 'error', message: 'Cannot suspend an account that is already Deactivated.' };
    }
    return { kind: 'apply' };
  }

  if (action === 'deactivate') {
    return current === 'Deactivated' ? { kind: 'noop' } : { kind: 'apply' };
  }

  // reactivate
  return current === 'Active' ? { kind: 'noop' } : { kind: 'apply' };
}