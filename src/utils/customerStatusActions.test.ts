import { describe, expect, it } from 'vitest';
import { getAvailableCustomerActions } from './customerStatusActions';

describe('getAvailableCustomerActions', () => {
  it('offers Suspend + Deactivate for an Active account', () => {
    expect(getAvailableCustomerActions('Active')).toEqual(['suspend', 'deactivate']);
  });

  it('offers Deactivate + Reactivate (not Suspend again) for a Suspended account', () => {
    expect(getAvailableCustomerActions('Suspended')).toEqual(['deactivate', 'reactivate']);
  });

  it('offers only Reactivate for a Deactivated account', () => {
    expect(getAvailableCustomerActions('Deactivated')).toEqual(['reactivate']);
  });
});
