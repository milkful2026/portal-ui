import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  validateExpiryDateField,
  validateQuantityDeltaField,
  validateReasonField,
  validateReceiveQuantityField,
} from './inventoryValidation';

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

describe('validateReceiveQuantityField', () => {
  it('requires a value', () => {
    expect(validateReceiveQuantityField('')).toBe('Quantity is required.');
  });

  it('rejects a non-integer value', () => {
    expect(validateReceiveQuantityField('1.5')).toBe('Quantity must be a whole number.');
  });

  it('rejects zero and negative values', () => {
    expect(validateReceiveQuantityField('0')).toBe('Quantity must be a positive number.');
    expect(validateReceiveQuantityField('-5')).toBe('Quantity must be a positive number.');
  });

  it('accepts a positive whole number', () => {
    expect(validateReceiveQuantityField('50')).toBeNull();
  });
});

describe('validateExpiryDateField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requires a value', () => {
    expect(validateExpiryDateField('')).toBe('Expiry date is required.');
  });

  it('rejects a past-dated value', () => {
    expect(validateExpiryDateField('2026-09-01')).toBe('Must be a future date.');
  });

  it('rejects today itself', () => {
    expect(validateExpiryDateField('2026-09-28')).toBe('Must be a future date.');
  });

  it('is valid for a future date', () => {
    expect(validateExpiryDateField('2026-10-15')).toBeNull();
  });
});