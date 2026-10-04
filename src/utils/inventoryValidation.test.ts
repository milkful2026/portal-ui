import { describe, expect, it } from 'vitest';
import { validateQuantityDeltaField, validateReasonField } from './inventoryValidation';

describe('validateQuantityDeltaField', () => {
  it('requires a value', () => {
    expect(validateQuantityDeltaField('')).toBe('Quantity is required.');
  });

  it('rejects a non-integer value', () => {
    expect(validateQuantityDeltaField('1.5')).toBe('Quantity must be a whole number.');
    expect(validateQuantityDeltaField('abc')).toBe('Quantity must be a whole number.');
  });

  it('rejects zero', () => {
    expect(validateQuantityDeltaField('0')).toBe('Quantity must not be zero.');
  });

  it('accepts a positive whole number', () => {
    expect(validateQuantityDeltaField('20')).toBeNull();
  });

  it('accepts a negative whole number', () => {
    expect(validateQuantityDeltaField('-20')).toBeNull();
  });
});

describe('validateReasonField', () => {
  it('requires a non-empty value', () => {
    expect(validateReasonField('')).toBe('Reason is required.');
    expect(validateReasonField('   ')).toBe('Reason is required.');
  });

  it('is valid for a non-empty value', () => {
    expect(validateReasonField('Spoilage')).toBeNull();
  });
});