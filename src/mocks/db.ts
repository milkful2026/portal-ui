import { AdminUser, CustomerAccount, CustomerStatusHistoryEntry } from '../api/types';

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
