import { AdminUser } from '../api/types';

export const MOCK_PASSWORD = 'Passw0rd!';
export const MOCK_TOTP_CODE = '123456';

/** In-memory admin directory for MSW. Reset on page reload — this is a dev/test
 * mock only, per the constraint not to call or expect a live backend. */
export let adminUsers: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'Sunita Rao',
    email: 'superadmin@milkful.test',
    role: 'SuperAdmin',
    status: 'Active',
    lastLoginAt: '2026-09-14T09:12:00.000Z',
  },
  {
    id: 'admin-2',
    name: 'Vikram Shah',
    email: 'ops@milkful.test',
    role: 'Ops',
    status: 'Active',
    lastLoginAt: '2026-09-15T08:03:00.000Z',
  },
  {
    id: 'admin-3',
    name: 'Priya Nair',
    email: 'finance@milkful.test',
    role: 'Finance',
    status: 'Active',
    lastLoginAt: null,
  },
  {
    id: 'admin-4',
    name: 'Arjun Mehta',
    email: 'support@milkful.test',
    role: 'Support',
    status: 'Pending',
    lastLoginAt: null,
  },
  {
    id: 'admin-5',
    name: 'Divya Iyer',
    email: 'marketing@milkful.test',
    role: 'Marketing',
    status: 'Deactivated',
    lastLoginAt: '2026-08-01T11:45:00.000Z',
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
