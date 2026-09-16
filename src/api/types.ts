/**
 * Types for the MA-129 Identity & Auth admin API contract, as documented in
 * MA-128 §6/§7. MA-129 is being implemented in parallel; these shapes are
 * built against the *documented* contract only, not a live backend.
 *
 * Ambiguity resolved: §7 only specifies the DTO for GET /v1/admin/users.
 * The login/2FA/create/edit response envelopes are not spelled out, so this
 * file extends the same envelope shape shown in §7 (`requestId` / `status` /
 * `data`, with a parallel `error` shape for failures) consistently across
 * every endpoint in §6's table. This is a reasonable, conventional choice
 * flagged here per the spec's instruction to note resolved ambiguity.
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
  ipAllowlist?: string[];
  maxConcurrentSessions?: number | null;
}

export interface ApiSuccessEnvelope<T> {
  requestId: string;
  status: 'success';
  data: T;
}

export interface ApiErrorEnvelope {
  requestId: string;
  status: 'error';
  error: {
    code: string;
    message: string;
  };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

// ---- POST /v1/admin/auth/login ----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  /** Opaque token identifying the in-progress login, passed to the 2FA step. */
  mfaToken: string;
}

// ---- POST /v1/admin/auth/2fa/verify ----
export interface TwoFactorVerifyRequest {
  mfaToken: string;
  code: string;
}

export interface TwoFactorVerifyResponseData {
  accessToken: string;
  refreshToken: string;
}

// ---- GET /v1/admin/users ----
export interface ListAdminUsersResponseData {
  items: AdminUser[];
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
