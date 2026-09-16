import { http, HttpResponse } from 'msw';
import { adminUsers, findByEmail, findById, MOCK_PASSWORD, MOCK_TOTP_CODE, nextId } from './db';
import { buildMockJwt } from './jwt';
import { AdminUser, CreateAdminUserRequest, LoginRequest, TwoFactorVerifyRequest, UpdateAdminUserRequest } from '../api/types';

function ok<T>(data: T, status = 200) {
  return HttpResponse.json({ requestId: crypto.randomUUID(), status: 'success', data }, { status });
}

function fail(code: string, message: string, status: number) {
  return HttpResponse.json({ requestId: crypto.randomUUID(), status: 'error', error: { code, message } }, { status });
}

// mfaToken -> { email }
const pendingLogins = new Map<string, { email: string }>();
// email -> { count, firstFailureAt }
const failedAttempts = new Map<string, { count: number; firstFailureAt: number }>();
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isLockedOut(email: string): boolean {
  const record = failedAttempts.get(email);
  if (!record) return false;
  if (Date.now() - record.firstFailureAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(email);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(email: string) {
  const existing = failedAttempts.get(email);
  if (!existing || Date.now() - existing.firstFailureAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(email, { count: 1, firstFailureAt: Date.now() });
  } else {
    existing.count += 1;
  }
}

export const handlers = [
  http.post('/v1/admin/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    const user = findByEmail(body.email);

    // Never reveal whether the email exists — generic message for both
    // "no such account" and "wrong password".
    if (!user || body.password !== MOCK_PASSWORD) {
      return fail('INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
    }

    if (user.status === 'Pending') {
      return fail('ACCOUNT_PENDING', "This account hasn't been activated yet. Check your email for an invitation link.", 403);
    }
    if (user.status === 'Deactivated') {
      return fail('ACCOUNT_DEACTIVATED', 'This account has been deactivated. Contact a Super-Admin for access.', 403);
    }

    if (isLockedOut(user.email)) {
      return fail('TOO_MANY_ATTEMPTS', 'Too many attempts. Try again in 15 minutes.', 429);
    }

    const mfaToken = crypto.randomUUID();
    pendingLogins.set(mfaToken, { email: user.email });
    return ok({ mfaToken });
  }),

  http.post('/v1/admin/auth/2fa/verify', async ({ request }) => {
    const body = (await request.json()) as TwoFactorVerifyRequest;
    const pending = pendingLogins.get(body.mfaToken);
    if (!pending) {
      return fail('INVALID_CODE', 'Incorrect code. Try again.', 401);
    }

    if (isLockedOut(pending.email)) {
      return fail('TOO_MANY_ATTEMPTS', 'Too many attempts. Try again in 15 minutes.', 429);
    }

    if (body.code !== MOCK_TOTP_CODE) {
      recordFailure(pending.email);
      if (isLockedOut(pending.email)) {
        return fail('TOO_MANY_ATTEMPTS', 'Too many attempts. Try again in 15 minutes.', 429);
      }
      return fail('INVALID_CODE', 'Incorrect code. Try again.', 401);
    }

    failedAttempts.delete(pending.email);
    pendingLogins.delete(body.mfaToken);
    const user = findByEmail(pending.email)!;
    const accessToken = buildMockJwt({ sub: user.id, email: user.email, role: user.role });
    return ok({ accessToken, refreshToken: crypto.randomUUID() });
  }),

  http.get('/v1/admin/users', () => {
    return ok({ items: adminUsers });
  }),

  http.post('/v1/admin/users', async ({ request }) => {
    const body = (await request.json()) as CreateAdminUserRequest;
    if (findByEmail(body.email)) {
      return fail('DUPLICATE_EMAIL', 'An admin with this email already exists.', 409);
    }
    const newUser: AdminUser = {
      id: nextId(),
      name: body.name,
      email: body.email,
      role: body.role,
      status: 'Pending',
      lastLoginAt: null,
    };
    adminUsers.push(newUser);
    return ok(newUser, 201);
  }),

  http.patch('/v1/admin/users/:id', async ({ request, params }) => {
    const user = findById(params.id as string);
    if (!user) {
      return fail('NOT_FOUND', 'Admin not found.', 404);
    }
    const body = (await request.json()) as UpdateAdminUserRequest;
    if (body.role !== undefined) user.role = body.role;
    if (body.ipAllowlist !== undefined) user.ipAllowlist = body.ipAllowlist;
    if (body.maxConcurrentSessions !== undefined) user.maxConcurrentSessions = body.maxConcurrentSessions;
    return ok(user);
  }),

  http.post('/v1/admin/users/:id/deactivate', ({ params }) => {
    const user = findById(params.id as string);
    if (!user) {
      return fail('NOT_FOUND', 'Admin not found.', 404);
    }
    user.status = 'Deactivated';
    return ok(user);
  }),

  http.post('/v1/admin/users/:id/reactivate', ({ params }) => {
    const user = findById(params.id as string);
    if (!user) {
      return fail('NOT_FOUND', 'Admin not found.', 404);
    }
    user.status = 'Active';
    return ok(user);
  }),
];
