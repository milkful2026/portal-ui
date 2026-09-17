/**
 * Types for the MA-129 Identity & Auth admin API contract.
 *
 * Verified against the real, implemented backend
 * (services/identity-auth/src/handlers/admin_auth/*, admin_users/dto.py,
 * domain/admin_exceptions.py) on 2026-09-17, replacing an earlier version
 * of this file that was built against the documented-but-unimplemented
 * contract and diverged from it in several ways (field names, error
 * envelope shape, error codes) — caught by code review, not by any test,
 * since the mocks in src/mocks/ had independently invented the same
 * divergent shapes and so exercised nothing real.
 */

export type AdminRole = 'Ops' | 'Finance' | 'Support' | 'Marketing' | 'SuperAdmin';

export type AdminStatus = 'Active' | 'Pending' | 'Deactivated';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastLoginAt: string | null;
  ipAllowlist: string[];
  maxConcurrentSessions: number | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiSuccessEnvelope<T> {
  requestId: string;
  status: 'success';
  data: T;
}

export interface ApiErrorEnvelope {
  requestId: string;
  status: 'error';
  /** Real shape is `data.errorCode`/`data.message` (handlers/dto.py's
   * `error_response`) — not a separate top-level `error` key. */
  data: {
    errorCode: string;
    message: string;
  };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

/** The complete, real error-code taxonomy
 * (domain/admin_exceptions.py) — used so call sites get a typo-checked
 * reference instead of hand-typed string literals that can silently
 * drift from the backend again. */
export const AdminErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ROLE: 'INVALID_ROLE',
  INVALID_CIDR: 'INVALID_CIDR',
  INCORRECT_CREDENTIALS: 'INCORRECT_CREDENTIALS',
  ADMIN_ACCOUNT_PENDING: 'ADMIN_ACCOUNT_PENDING',
  ADMIN_ACCOUNT_DEACTIVATED: 'ADMIN_ACCOUNT_DEACTIVATED',
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
  INVALID_2FA_CODE: 'INVALID_2FA_CODE',
  ADMIN_ACCOUNT_LOCKED: 'ADMIN_ACCOUNT_LOCKED',
  ADMIN_EMAIL_EXISTS: 'ADMIN_EMAIL_EXISTS',
  ADMIN_NOT_FOUND: 'ADMIN_NOT_FOUND',
  SELF_DEACTIVATION_NOT_ALLOWED: 'SELF_DEACTIVATION_NOT_ALLOWED',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
} as const;

// ---- POST /v1/admin/auth/login ----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  /** Single-use, short-lived token identifying the in-progress login,
   * passed to the 2FA step. Named `challengeToken` on the wire — not
   * `mfaToken` (login_handler.py's actual success_response key). */
  challengeToken: string;
  expiresIn: number;
}

// ---- POST /v1/admin/auth/2fa/verify ----
export interface TwoFactorVerifyRequest {
  challengeToken: string;
  code: string;
}

export interface TwoFactorVerifyResponseData {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

// ---- GET /v1/admin/users ----
export interface ListAdminUsersResponseData {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- POST /v1/admin/users ----
export interface CreateAdminUserRequest {
  name: string;
  email: string;
  role: AdminRole;
}

// ---- PATCH /v1/admin/users/{id} ----
export interface UpdateAdminUserRequest {
  role?: AdminRole;
  ipAllowlist?: string[];
  maxConcurrentSessions?: number | null;
}

export class ApiError extends Error {
  code: string;
  httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
