import { describe, expect, it } from 'vitest';
import { checkAdjustmentFloor, computeAvailable, computeStockState } from './inventoryAdjustment';
import { StockBatch } from '../api/types';

describe('checkAdjustmentFloor', () => {
  it('rejects a plain on-hand-negative adjustment (no reservations involved)', () => {
    const result = checkAdjustmentFloor(10, 0, -20, []);
    expect(result).toEqual({ ok: false, errorCode: 'ON_HAND_NEGATIVE', message: 'This would leave negative on-hand stock.' });
  });

  it('rejects an available-negative adjustment caused by reserved orders, with a DISTINCT message from the plain on-hand case', () => {
    // Spec section 10's exact scenario: on_hand=100, reserved=90 (available=10).
    const result = checkAdjustmentFloor(100, 90, -20, []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.errorCode).toBe('AVAILABLE_NEGATIVE');
    expect(result.message).toBe('This would leave negative available stock (reserved orders exist).');

    // The two rejection reasons must never share wording - that's the
    // entire point of FR-4's "two distinct checks" requirement.
    const onHandCase = checkAdjustmentFloor(10, 0, -20, []);
    expect(onHandCase.ok).toBe(false);
    if (onHandCase.ok) throw new Error('unreachable');
    expect(onHandCase.message).not.toBe(result.message);
    expect(onHandCase.errorCode).not.toBe(result.errorCode);
  });

  it('allows a valid positive adjustment', () => {
    expect(checkAdjustmentFloor(100, 10, 5, [])).toEqual({ ok: true });
  });

  it('allows a valid negative adjustment that does not cross either floor', () => {
    expect(checkAdjustmentFloor(100, 10, -20, [])).toEqual({ ok: true });
  });

  it('treats an adjustment landing exactly on zero available as valid (not negative)', () => {
    expect(checkAdjustmentFloor(100, 90, -10, [])).toEqual({ ok: true });
  });
});

describe('computeAvailable / computeStockState', () => {
  const futureBatch: StockBatch = {
    batchId: 'batch-x',
    quantity: 50,
    expiryDate: '2099-01-01',
    availableFrom: '2099-06-01',
    receivedAt: '2026-01-01T00:00:00.000Z',
  };

  it('subtracts not-yet-available batch quantity from available', () => {
    const now = new Date('2026-10-02T00:00:00.000Z');
    expect(computeAvailable(50, 0, [futureBatch], now)).toBe(0);
  });

  it('classifies as AVAILABLE_FROM when available is zero but a future batch exists', () => {
    const now = new Date('2026-10-02T00:00:00.000Z');
    const available = computeAvailable(50, 0, [futureBatch], now);
    expect(computeStockState(available, [futureBatch], now)).toBe('AVAILABLE_FROM');
  });

  it('classifies as OUT_OF_STOCK when available is zero and no future batch exists', () => {
    expect(computeStockState(0, [])).toBe('OUT_OF_STOCK');
  });

  it('classifies as IN_STOCK when available is positive', () => {
    expect(computeStockState(10, [])).toBe('IN_STOCK');
  });
});