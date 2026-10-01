import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isFutureDate, validateUntilField } from './futureDate';

describe('isFutureDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a date strictly after today', () => {
    expect(isFutureDate('2026-09-29')).toBe(true);
    expect(isFutureDate('2027-01-01')).toBe(true);
  });

  it('rejects today itself', () => {
    expect(isFutureDate('2026-09-28')).toBe(false);
  });

  it('rejects a past date', () => {
    expect(isFutureDate('2026-09-01')).toBe(false);
  });

  it('rejects an empty or malformed value', () => {
    expect(isFutureDate('')).toBe(false);
    expect(isFutureDate('not-a-date')).toBe(false);
  });
});

describe('validateUntilField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requires a value', () => {
    expect(validateUntilField('')).toBe('An end date is required.');
  });

  it('rejects a past-dated value with an inline message', () => {
    expect(validateUntilField('2026-09-01')).toBe('Must be a future date.');
  });

  it('is valid for a future date', () => {
    expect(validateUntilField('2026-10-01')).toBeNull();
  });
});
