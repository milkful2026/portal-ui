/**
 * State-aware action-menu logic for Customer Accounts (FR-4's three-state
 * machine): an Active account offers Suspend + Deactivate; a Suspended
 * account offers Deactivate + Reactivate (not Suspend again); a
 * Deactivated account offers only Reactivate. Mirrors AdminUsersPage's
 * existing Deactivate-or-Reactivate pattern, extended to three states.
 *
 * Pulled out as a pure function (rather than inlined JSX conditionals) so
 * it has its own unit tests, per spec §10: "Unit tests for ... state-aware
 * action-menu logic (FR-4's three-state machine)."
 */

import { CustomerStatus } from '../api/types';

export type CustomerStatusAction = 'suspend' | 'deactivate' | 'reactivate';

export function getAvailableCustomerActions(status: CustomerStatus): CustomerStatusAction[] {
  switch (status) {
    case 'Active':
      return ['suspend', 'deactivate'];
    case 'Suspended':
      return ['deactivate', 'reactivate'];
    case 'Deactivated':
      return ['reactivate'];
  }
}
