/**
 * Pure business-rule helpers for Admin Inventory Management (MA-151 FR-4,
 * MA-119 FR-1): the two floor-at-zero checks an adjustment must pass, plus
 * the derived "available" quantity and stock-state classification MA-150's
 * endpoints compute server-side. Pulled out as pure functions (same
 * discipline as utils/customerStatusActions.ts) so they have their own
 * unit tests and so the MSW mock (src/mocks/handlers.ts) and this app's own
 * expectations can never silently drift apart - the two floor checks MUST
 * stay two distinct checks with two distinct messages (FR-4/9/10): a
 * single generic check here would defeat the entire point of this file.
 */

import { StockBatch, StockState } from '../api/types';

/** Quantity still "received" (counted in onHand) but not yet sellable
 * because its batch's availableFrom date hasn't arrived - this is what
 * distinguishes AVAILABLE_FROM from a plain IN_STOCK/OUT_OF_STOCK read. */
export function computeNotYetAvailableQuantity(batches: StockBatch[], now: Date = new Date()): number {
  return batches
    .filter((b) => b.availableFrom && new Date(`${b.availableFrom}T00:00:00`) > now)
    .reduce((sum, b) => sum + b.quantity, 0);
}

export function computeAvailable(onHand: number, reserved: number, batches: StockBatch[], now: Date = new Date()): number {
  return onHand - reserved - computeNotYetAvailableQuantity(batches, now);
}

export function computeStockState(available: number, batches: StockBatch[], now: Date = new Date()): StockState {
  if (available > 0) return 'IN_STOCK';
  const hasFutureAvailability = batches.some((b) => b.availableFrom && new Date(`${b.availableFrom}T00:00:00`) > now);
  return hasFutureAvailability ? 'AVAILABLE_FROM' : 'OUT_OF_STOCK';
}

export type AdjustmentFloorErrorCode = 'ON_HAND_NEGATIVE' | 'AVAILABLE_NEGATIVE';

export type AdjustmentCheckResult =
  | { ok: true }
  | { ok: false; errorCode: AdjustmentFloorErrorCode; message: string };

/** FR-4/MA-119 FR-1's two distinct floor-at-zero checks, run in order:
 *
 * 1. Would this adjustment drive on_hand itself negative? (a plain
 *    overcorrection, nothing to do with reservations)
 * 2. Would on_hand stay non-negative, but driving `available` negative
 *    because reserved/outstanding orders exist? A materially different
 *    failure an Ops admin needs to understand differently (FR-4/9) - so
 *    this returns a distinct errorCode and a distinct message from case 1,
 *    never a shared generic one.
 */
export function checkAdjustmentFloor(
  onHand: number,
  reserved: number,
  quantityDelta: number,
  batches: StockBatch[] = [],
  now: Date = new Date(),
): AdjustmentCheckResult {
  const newOnHand = onHand + quantityDelta;
  if (newOnHand < 0) {
    return { ok: false, errorCode: 'ON_HAND_NEGATIVE', message: 'This would leave negative on-hand stock.' };
  }
  const newAvailable = computeAvailable(newOnHand, reserved, batches, now);
  if (newAvailable < 0) {
    return {
      ok: false,
      errorCode: 'AVAILABLE_NEGATIVE',
      message: 'This would leave negative available stock (reserved orders exist).',
    };
  }
  return { ok: true };
}