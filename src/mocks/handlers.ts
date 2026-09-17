import { http, HttpResponse } from 'msw';
import { adminUsers, findByEmail, findById, MOCK_PASSWORD, MOCK_TOTP_CODE, nextId } from './db';
import { buildMockJwt } from './jwt';
import {
  AdminErrorCode,
  AdminUser,
  CreateAdminUserRequest,
  LoginRequest,
  TwoFactorVerifyRequest,
  UpdateAdminUserRequest,
} from '../api/types';

function ok<T>(data: T, status = 200) {
  return HttpResponse.json({ requestId: crypto.randomUUID(), status: 'success', data }, { status });
}

function fail(errorCode: string, message: string, status: number) {
  return HttpResponse.json(
    { requestId: crypto.randomUUID(), status: 'error', data: { errorCode, message } },
    { status },
  );
}

// challengeToken -> { email }
const pendingLogins = new Map<string, { email: string }>();
// email -> { count, firstFailureAt }
const failedAttempts = new Map<string, { count: number; firstFailureAt: number }>();
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

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
    // "no such account" and "wrong password", matching
    // IncorrectAdminCredentialsError (admin_exceptions.py).
    if (!user || body.password !== MOCK_PASSWORD) {
      return fail(AdminErrorCode.INCORRECT_CREDENTIALS, 'Incorrect email or password', 401);
    }

    if (user.status === 'Pending') {
      return fail(AdminErrorCode.ADMIN_ACCOUNT_PENDING, 'This account is pending activation', 403);
    }
    if (user.status === 'Deactivated') {
      return fail(AdminErrorCode.ADMIN_ACCOUNT_DEACTIVATED, 'This account has been deactivated', 403);
    }

    const challengeToken = crypto.randomUUID();
    pendingLogins.set(challengeToken, { email: user.email });
    setTimeout(() => pendingLogins.delete(challengeToken), CHALLENGE_TTL_MS);
    return ok({ challengeToken, expiresIn: CHALLENGE_TTL_MS / 1000 });
  }),

  http.post('/v1/admin/auth/2fa/verify', async ({ request }) => {
    const body = (await request.json()) as TwoFactorVerifyRequest;
    const pending = pendingLogins.get(body.challengeToken);
    if (!pending) {
      return fail(AdminErrorCode.CHALLENGE_EXPIRED, 'Challenge has expired, please log in again', 401);
    }

    const user = findByEmail(pending.email)!;
    if (user.status !== 'Active') {
      // Mirrors login_service.py's verify_2fa status re-check: the
      // admin could have been deactivated/reverted to Pending during
      // the 2FA window since login_password issued this challenge.
      pendingLogins.delete(body.challengeToken);
      return fail(AdminErrorCode.CHALLENGE_EXPIRED, 'Challenge has expired, please log in again', 401);
    }

    if (isLockedOut(pending.email)) {
      return fail(
        AdminErrorCode.ADMIN_ACCOUNT_LOCKED,
        'Account temporarily locked due to too many failed attempts',
        401,
      );
    }

    if (body.code !== MOCK_TOTP_CODE) {
      recordFailure(pending.email);
      if (isLockedOut(pending.email)) {
        return fail(
          AdminErrorCode.ADMIN_ACCOUNT_LOCKED,
          'Account temporarily locked due to too many failed attempts',
          401,
        );
      }
      return fail(AdminErrorCode.INVALID_2FA_CODE, 'Incorrect verification code', 401);
    }

    failedAttempts.delete(pending.email);
    pendingLogins.delete(body.challengeToken);
    user.lastLoginAt = new Date().toISOString();
    const accessToken = buildMockJwt({ sub: user.id, email: user.email, role: user.role });
    return ok({
      accessToken,
      refreshToken: crypto.randomUUID(),
      idToken: buildMockJwt({ sub: user.id, email: user.email, role: user.role }),
      expiresIn: 900,
    });
  }),

  http.get('/v1/admin/users', () => {
    return ok({ items: adminUsers, total: adminUsers.length, page: 1, pageSize: adminUsers.length });
  }),

  http.post('/v1/admin/users', async ({ request }) => {
    const body = (await request.json()) as CreateAdminUserRequest;
    if (findByEmail(body.email)) {
      return fail(AdminErrorCode.ADMIN_EMAIL_EXISTS, 'An admin with this email already exists', 409);
    }
    const now = new Date().toISOString();
    const newUser: AdminUser = {
      id: nextId(),
      name: body.name,
      email: body.email,
      role: body.role,
      status: 'Pending',
      lastLoginAt: null,
      ipAllowlist: [],
      maxConcurrentSessions: null,
      createdBy: 'admin-1',
      createdAt: now,
      updatedAt: now,
    };
    adminUsers.push(newUser);
    return ok(newUser, 201);
  }),

  http.patch('/v1/admin/users/:id', async ({ request, params }) => {
    const user = findById(params.id as string);
    if (!user) {
      return fail(AdminErrorCode.ADMIN_NOT_FOUND, 'Admin user not found', 404);
    }
    const body = (await request.json()) as UpdateAdminUserRequest;
    if (body.role !== undefined) user.role = body.role;
    if (body.ipAllowlist !== undefined) user.ipAllowlist = body.ipAllowlist;
    if (body.maxConcurrentSessions !== undefined) user.maxConcurrentSessions = body.maxConcurrentSessions;
    user.updatedAt = new Date().toISOString();
    return ok(user);
  }),

  http.post('/v1/admin/users/:id/deactivate', ({ params }) => {
    const user = findById(params.id as string);
    if (!user) {
      return fail(AdminErrorCode.ADMIN_NOT_FOUND, 'Admin user not found', 404);
    }
    user.status = 'Deactivated';
    user.updatedAt = new Date().toISOString();
    return ok(user);
  }),

  http.post('/v1/admin/users/:id/reactivate', ({ params }) => {
    const user = findById(params.id as string);
    if (!user) {
      return fail(AdminErrorCode.ADMIN_NOT_FOUND, 'Admin user not found', 404);
    }
    user.status = 'Active';
    user.updatedAt = new Date().toISOString();
    return ok(user);
  }),
];
