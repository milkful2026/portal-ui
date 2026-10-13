import { describe, expect, it } from 'vitest';
import {
  validateCategorySortOrderField,
  validateOptionalPriceField,
  validatePriceB2cField,
  validateRequiredTextField,
} from './catalogValidation';

describe('validateRequiredTextField', () => {
  it('requires a non-empty value', () => {
    expect(validateRequiredTextField('', 'Name')).toBe('Name is required.');
    expect(validateRequiredTextField('   ', 'Unit')).toBe('Unit is required.');
  });

  it('is valid for a non-empty value', () => {
    expect(validateRequiredTextField('Cow Milk', 'Name')).toBeNull();
  });
});

describe('validatePriceB2cField', () => {
  it('requires a value', () => {
    expect(validatePriceB2cField('')).toBe('Price (B2C) is required.');
  });

  it('rejects a non-numeric value', () => {
    expect(validatePriceB2cField('abc')).toBe('Price (B2C) must be a number.');
  });

  it('rejects zero and negative values', () => {
    expect(validatePriceB2cField('0')).toBe('Price (B2C) must be a positive number.');
    expect(validatePriceB2cField('-5')).toBe('Price (B2C) must be a positive number.');
  });

  it('accepts a positive number', () => {
    expect(validatePriceB2cField('68')).toBeNull();
    expect(validatePriceB2cField('68.50')).toBeNull();
  });
});

describe('validateOptionalPriceField', () => {
  it('is valid when empty', () => {
    expect(validateOptionalPriceField('', 'Price (B2B)')).toBeNull();
  });

  it('rejects a non-numeric value', () => {
    expect(validateOptionalPriceField('abc', 'Tax Rate')).toBe('Tax Rate must be a number.');
  });

  it('rejects a negative value', () => {
    expect(validateOptionalPriceField('-1', 'Price (B2B)')).toBe('Price (B2B) must not be negative.');
  });

  it('accepts a non-negative number', () => {
    expect(validateOptionalPriceField('0', 'Tax Rate')).toBeNull();
    expect(validateOptionalPriceField('5.5', 'Tax Rate')).toBeNull();
  });
});

describe('validateCategorySortOrderField', () => {
  it('is valid when empty', () => {
    expect(validateCategorySortOrderField('')).toBeNull();
  });

  it('rejects a non-integer value', () => {
    expect(validateCategorySortOrderField('1.5')).toBe('Sort order must be a whole number.');
    expect(validateCategorySortOrderField('abc')).toBe('Sort order must be a whole number.');
  });

  it('accepts a whole number', () => {
    expect(validateCategorySortOrderField('3')).toBeNull();
  });
});
