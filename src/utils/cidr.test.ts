import { describe, expect, it } from 'vitest';
import { isValidCidr, parseCidrList, validateCidrField } from './cidr';

describe('isValidCidr', () => {
  it('accepts a valid CIDR range', () => {
    expect(isValidCidr('10.0.0.0/8')).toBe(true);
    expect(isValidCidr('192.168.1.0/24')).toBe(true);
    expect(isValidCidr('0.0.0.0/0')).toBe(true);
    expect(isValidCidr('255.255.255.255/32')).toBe(true);
  });

  it('rejects malformed entries', () => {
    expect(isValidCidr('10.0.0.0')).toBe(false); // missing prefix
    expect(isValidCidr('10.0.0.0/33')).toBe(false); // prefix out of range
    expect(isValidCidr('999.0.0.0/8')).toBe(false); // octet out of range
    expect(isValidCidr('not-an-ip/24')).toBe(false);
    expect(isValidCidr('')).toBe(false);
  });

  it('tolerates surrounding whitespace', () => {
    expect(isValidCidr('  10.0.0.0/8  ')).toBe(true);
  });
});

describe('parseCidrList', () => {
  it('splits a comma-separated list into valid and invalid entries', () => {
    const result = parseCidrList('10.0.0.0/8, 192.168.1.0/24, garbage');
    expect(result.valid).toEqual(['10.0.0.0/8', '192.168.1.0/24']);
    expect(result.invalid).toEqual(['garbage']);
  });

  it('drops empty entries from stray commas/whitespace', () => {
    const result = parseCidrList('10.0.0.0/8, , 192.168.1.0/24,');
    expect(result.valid).toEqual(['10.0.0.0/8', '192.168.1.0/24']);
    expect(result.invalid).toEqual([]);
  });

  it('returns empty lists for empty input', () => {
    expect(parseCidrList('')).toEqual({ valid: [], invalid: [] });
  });
});

describe('validateCidrField', () => {
  it('is valid when empty (no IP restriction)', () => {
    expect(validateCidrField('')).toBeNull();
    expect(validateCidrField('   ')).toBeNull();
  });

  it('is valid when all entries parse', () => {
    expect(validateCidrField('10.0.0.0/8, 192.168.1.0/24')).toBeNull();
  });

  it('returns an inline error message naming the bad entries', () => {
    expect(validateCidrField('10.0.0.0/8, garbage')).toBe('Invalid CIDR range: garbage');
  });
});
