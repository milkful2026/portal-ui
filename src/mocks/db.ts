import { AdminUser, CustomerAccount, CustomerStatusHistoryEntry, InventoryAuditLogEntry, StockBatch } from '../api/types';

export const MOCK_PASSWORD = 'Passw0rd!';
export const MOCK_TOTP_CODE = '123456';

/** In-memory admin directory for MSW. Reset on page reload — this is a dev/test
 * mock only, per the constraint not to call or expect a live backend. */
const SEEDED_AT = '2026-09-01T00:00:00.000Z';

export let adminUsers: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'Sunita Rao',
    email: 'superadmin@milkful.test',
    role: 'SuperAdmin',
    status: 'Active',
    lastLoginAt: '2026-09-14T09:12:00.000Z',
    ipAllowlist: [],
    maxConcurrentSessions: null,
    createdBy: null,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'admin-2',
    name: 'Vikram Shah',
    email: 'ops@milkful.test',
    role: 'Ops',
    status: 'Active',
    lastLoginAt: '2026-09-15T08:03:00.000Z',
    ipAllowlist: [],
    maxConcurrentSessions: null,
    createdBy: 'admin-1',
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'admin-3',
    name: 'Priya Nair',
    email: 'finance@milkful.test',
    role: 'Finance',
    status: 'Active',
    lastLoginAt: null,
    ipAllowlist: [],
    maxConcurrentSessions: null,
    createdBy: 'admin-1',
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'admin-4',
    name: 'Arjun Mehta',
    email: 'support@milkful.test',
    role: 'Support',
    status: 'Pending',
    lastLoginAt: null,
    ipAllowlist: [],
    maxConcurrentSessions: null,
    createdBy: 'admin-1',
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'admin-5',
    name: 'Divya Iyer',
    email: 'marketing@milkful.test',
    role: 'Marketing',
    status: 'Deactivated',
    lastLoginAt: '2026-08-01T11:45:00.000Z',
    ipAllowlist: [],
    maxConcurrentSessions: null,
    createdBy: 'admin-1',
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

export function resetAdminUsers(next: AdminUser[]) {
  adminUsers = next;
}

export function findByEmail(email: string): AdminUser | undefined {
  return adminUsers.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export function findById(id: string): AdminUser | undefined {
  return adminUsers.find((a) => a.id === id);
}

let idCounter = adminUsers.length + 1;
export function nextId(): string {
  return `admin-${idCounter++}`;
}

/**
 * In-memory customer-account directory for MSW (MA-141 §12). Reset on page
 * reload — dev/test mock only, same constraint as adminUsers above. Seeded
 * with a realistic mix of Active/Suspended/Deactivated and B2C/B2B so the
 * list, detail history, and state-aware action menu are all demoable
 * without any manual setup.
 */
export const customerAccounts: CustomerAccount[] = [
  {
    id: 'customer-1',
    name: 'Priya Sharma',
    mobile: '+91-98765-43210',
    email: 'priya.sharma@example.com',
    accountType: 'B2C',
    status: 'Active',
    statusReason: null,
    lastStatusChangeAt: null,
  },
  {
    id: 'customer-2',
    name: 'Rohan Enterprises',
    mobile: '+91-98220-11223',
    email: 'accounts@rohanenterprises.example',
    accountType: 'B2B',
    status: 'Active',
    statusReason: null,
    lastStatusChangeAt: null,
  },
  {
    id: 'customer-3',
    name: 'Ananya Iyer',
    mobile: '+91-99870-11234',
    email: 'ananya.iyer@example.com',
    accountType: 'B2C',
    status: 'Suspended',
    statusReason: 'Repeated failed payment attempts',
    lastStatusChangeAt: '2026-09-20T10:15:00.000Z',
  },
  {
    id: 'customer-4',
    name: 'Karthik Traders',
    mobile: '+91-90000-22334',
    email: 'ops@karthiktraders.example',
    accountType: 'B2B',
    status: 'Suspended',
    statusReason: 'KYC re-verification pending',
    lastStatusChangeAt: '2026-09-22T14:30:00.000Z',
  },
  {
    id: 'customer-5',
    name: 'Meera Nair',
    mobile: '+91-98765-00011',
    email: 'meera.nair@example.com',
    accountType: 'B2C',
    status: 'Deactivated',
    statusReason: 'Customer requested account closure',
    lastStatusChangeAt: '2026-09-10T09:00:00.000Z',
  },
  {
    id: 'customer-6',
    name: 'Suresh Babu',
    mobile: '+91-99900-88771',
    email: 'suresh.babu@example.com',
    accountType: 'B2C',
    status: 'Deactivated',
    statusReason: 'Fraud investigation',
    lastStatusChangeAt: '2026-09-25T11:45:00.000Z',
  },
];

/** Keyed by customer id, each entry's array stored newest-first (already
 * reverse-chronological, per FR-3) so appendCustomerHistory below only
 * ever needs to unshift. */
export const customerStatusHistory: Record<string, CustomerStatusHistoryEntry[]> = {
  'customer-3': [
    {
      previousStatus: 'Active',
      newStatus: 'Suspended',
      reason: 'Repeated failed payment attempts',
      effectiveFrom: '2026-10-20',
      actorAdminId: 'admin-2',
      createdAt: '2026-09-20T10:15:00.000Z',
    },
  ],
  'customer-4': [
    {
      previousStatus: 'Active',
      newStatus: 'Suspended',
      reason: 'KYC re-verification pending',
      effectiveFrom: '2026-10-10',
      actorAdminId: 'admin-1',
      createdAt: '2026-09-22T14:30:00.000Z',
    },
  ],
  'customer-5': [
    {
      previousStatus: 'Active',
      newStatus: 'Deactivated',
      reason: 'Customer requested account closure',
      effectiveFrom: null,
      actorAdminId: 'admin-2',
      createdAt: '2026-09-10T09:00:00.000Z',
    },
  ],
  'customer-6': [
    {
      previousStatus: 'Suspended',
      newStatus: 'Deactivated',
      reason: 'Fraud investigation',
      effectiveFrom: null,
      actorAdminId: 'admin-1',
      createdAt: '2026-09-25T11:45:00.000Z',
    },
    {
      previousStatus: 'Active',
      newStatus: 'Suspended',
      reason: 'Suspicious transaction pattern flagged',
      effectiveFrom: '2026-09-30',
      actorAdminId: 'admin-1',
      createdAt: '2026-09-18T08:20:00.000Z',
    },
  ],
};

export function findCustomerById(id: string): CustomerAccount | undefined {
  return customerAccounts.find((c) => c.id === id);
}

export function getCustomerHistory(id: string): CustomerStatusHistoryEntry[] {
  return customerStatusHistory[id] ?? [];
}

export function appendCustomerHistory(id: string, entry: CustomerStatusHistoryEntry) {
  customerStatusHistory[id] = [entry, ...(customerStatusHistory[id] ?? [])];
}

let customerIdCounter = customerAccounts.length + 1;
export function nextCustomerId(): string {
  return `customer-${customerIdCounter++}`;
}

/**
 * In-memory inventory directory for MSW (MA-151 section 12). Reset on page
 * reload - dev/test mock only, same constraint as the directories above.
 * `onHand`/`reserved` are the only mutable source-of-truth fields; FR-2's
 * `available`/`stockState` are always DERIVED (see
 * utils/inventoryAdjustment.ts's computeAvailable/computeStockState) from
 * onHand/reserved/batches rather than stored and kept in sync by hand -
 * storing them separately is exactly the kind of drift MA-141's own
 * `statusHistory` field-name mismatch (see types.ts's docstring) warns
 * against repeating.
 *
 * Seeded with a deliberate mix of states so every FR-2 filter value and
 * every FR-3 edge case (section 9) is demoable without any manual setup:
 *   - product-1: healthy IN_STOCK, 3 batches, 2 audit entries (ADJUST + RECEIVE)
 *   - product-2: OUT_OF_STOCK, ZERO batches and ZERO audit history - the
 *     "freshly provisioned" empty-state edge case (section 9)
 *   - product-3: AVAILABLE_FROM - fully received (onHand=80) but its one
 *     batch's availableFrom is in the future, so available=0
 *   - product-4: IN_STOCK, 2 batches with different expiry dates (to
 *     exercise FR-3's oldest-expiry-first ordering) and 2 audit entries
 *   - product-5: IN_STOCK but tight - on_hand=100, reserved=90,
 *     available=10, the exact figures from spec section 10's third E2E
 *     scenario (adjustment rejected for driving `available` negative)
 */
export interface InventoryRecord {
  productId: string;
  onHand: number;
  reserved: number;
  lowStockThreshold: number;
}

export const inventoryRecords: InventoryRecord[] = [
  { productId: 'product-1', onHand: 500, reserved: 50, lowStockThreshold: 100 },
  { productId: 'product-2', onHand: 0, reserved: 0, lowStockThreshold: 50 },
  { productId: 'product-3', onHand: 80, reserved: 0, lowStockThreshold: 30 },
  { productId: 'product-4', onHand: 120, reserved: 20, lowStockThreshold: 20 },
  { productId: 'product-5', onHand: 100, reserved: 90, lowStockThreshold: 50 },
];

export const stockBatches: Record<string, StockBatch[]> = {
  'product-1': [
    { batchId: 'batch-1a', quantity: 150, expiryDate: '2026-10-20', availableFrom: null, receivedAt: '2026-09-20T08:00:00.000Z' },
    { batchId: 'batch-1b', quantity: 200, expiryDate: '2026-11-15', availableFrom: null, receivedAt: '2026-09-10T08:00:00.000Z' },
    { batchId: 'batch-1c', quantity: 150, expiryDate: '2026-12-01', availableFrom: null, receivedAt: '2026-09-25T08:00:00.000Z' },
  ],
  // product-2: no batches - freshly provisioned, zero-batches edge case.
  'product-3': [
    { batchId: 'batch-3a', quantity: 80, expiryDate: '2027-01-15', availableFrom: '2026-10-20', receivedAt: '2026-09-29T09:00:00.000Z' },
  ],
  'product-4': [
    { batchId: 'batch-4a', quantity: 70, expiryDate: '2026-10-25', availableFrom: null, receivedAt: '2026-09-18T07:00:00.000Z' },
    { batchId: 'batch-4b', quantity: 50, expiryDate: '2026-11-05', availableFrom: null, receivedAt: '2026-09-22T07:00:00.000Z' },
  ],
  'product-5': [
    { batchId: 'batch-5a', quantity: 100, expiryDate: '2026-10-30', availableFrom: null, receivedAt: '2026-09-20T08:00:00.000Z' },
  ],
};

/** Keyed by productId, each entry's array stored newest-first (already
 * reverse-chronological, per FR-3) so appendProductAuditEntry below only
 * ever needs to unshift - same convention as customerStatusHistory above. */
export const inventoryAuditLog: Record<string, InventoryAuditLogEntry[]> = {
  'product-1': [
    {
      actionType: 'ADJUST',
      previousOnHand: 520,
      newOnHand: 500,
      quantityDelta: -20,
      reason: 'Spoilage - damaged during transit',
      actorAdminId: 'admin-2',
      createdAt: '2026-09-28T10:00:00.000Z',
    },
    {
      actionType: 'RECEIVE',
      previousOnHand: 370,
      newOnHand: 520,
      quantityDelta: 150,
      reason: null,
      actorAdminId: 'admin-2',
      createdAt: '2026-09-25T08:05:00.000Z',
    },
  ],
  // product-2: no audit history - zero-history edge case.
  'product-3': [
    {
      actionType: 'RECEIVE',
      previousOnHand: 0,
      newOnHand: 80,
      quantityDelta: 80,
      reason: null,
      actorAdminId: 'admin-1',
      createdAt: '2026-09-29T09:00:05.000Z',
    },
  ],
  'product-4': [
    {
      actionType: 'RECEIVE',
      previousOnHand: 50,
      newOnHand: 120,
      quantityDelta: 70,
      reason: null,
      actorAdminId: 'admin-2',
      createdAt: '2026-09-18T07:05:00.000Z',
    },
    {
      actionType: 'ADJUST',
      previousOnHand: 55,
      newOnHand: 50,
      quantityDelta: -5,
      reason: 'Count correction after stocktake',
      actorAdminId: 'admin-1',
      createdAt: '2026-09-15T12:00:00.000Z',
    },
  ],
  'product-5': [
    {
      actionType: 'RECEIVE',
      previousOnHand: 0,
      newOnHand: 100,
      quantityDelta: 100,
      reason: null,
      actorAdminId: 'admin-2',
      createdAt: '2026-09-20T08:00:05.000Z',
    },
  ],
};

export function findInventoryRecord(productId: string): InventoryRecord | undefined {
  return inventoryRecords.find((p) => p.productId === productId);
}

export function getProductBatches(productId: string): StockBatch[] {
  return stockBatches[productId] ?? [];
}

export function appendProductBatch(productId: string, batch: StockBatch) {
  stockBatches[productId] = [...(stockBatches[productId] ?? []), batch];
}

export function getProductAuditLog(productId: string): InventoryAuditLogEntry[] {
  return inventoryAuditLog[productId] ?? [];
}

export function appendProductAuditEntry(productId: string, entry: InventoryAuditLogEntry) {
  inventoryAuditLog[productId] = [entry, ...(inventoryAuditLog[productId] ?? [])];
}

let batchIdCounter = 100;
export function nextBatchId(): string {
  return `batch-${batchIdCounter++}`;
}
