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

/**
 * Types for the MA-141 Customer Account Management admin API contract.
 *
 * Authoritative source is MA-139 (User Service) — see
 * specs/portal-ui/tasks/MA/MA-39/MA-141.md §7/§8: "this spec's DTOs must be
 * kept in sync with it during implementation." Modeled directly on that
 * spec's §7 JSON, following this file's existing naming convention
 * (AdminUser/ListAdminUsersResponseData, etc.) rather than inventing a new
 * one.
 */

export type CustomerAccountType = 'B2C' | 'B2B';

export type CustomerStatus = 'Active' | 'Suspended' | 'Deactivated';

export interface CustomerAccount {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  accountType: CustomerAccountType;
  status: CustomerStatus;
  statusReason: string | null;
  lastStatusChangeAt: string | null;
}

export interface CustomerStatusHistoryEntry {
  previousStatus: CustomerStatus | null;
  newStatus: CustomerStatus;
  reason: string | null;
  effectiveFrom: string | null;
  actorAdminId: string;
  createdAt: string;
}

export interface CustomerAccountDetail extends CustomerAccount {
  // Field name confirmed against the real User Service response, not the
  // MA-139 spec's own §7 example (which calls it `history`) — the shipped
  // backend implementation uses `statusHistory`. Renamed here to match
  // reality rather than the spec text, since the backend is the harder
  // side to change at this point and the two were never cross-checked
  // live during parallel implementation.
  statusHistory: CustomerStatusHistoryEntry[];
}

// ---- GET /v1/admin/customers ----
export interface ListCustomerAccountsResponseData {
  items: CustomerAccount[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- POST /v1/admin/customers/{id}/suspend ----
export interface SuspendCustomerRequest {
  reason: string;
  /** ISO-8601 date; must be a future date (FR-4, validated client-side
   * before submit — final validation authority is still the backend). */
  until: string;
}

// ---- POST /v1/admin/customers/{id}/deactivate ----
export interface DeactivateCustomerRequest {
  reason: string;
}

// ---- POST /v1/admin/customers/{id}/reactivate ----
export interface ReactivateCustomerRequest {
  reason?: string;
}

export type BulkCustomerAction = 'suspend' | 'deactivate' | 'reactivate';

// ---- POST /v1/admin/customers/bulk-status ----
export interface BulkCustomerStatusRequest {
  customerIds: string[];
  action: BulkCustomerAction;
  reason?: string;
  until?: string;
}

export interface BulkCustomerStatusResultItem {
  customerId: string;
  success: boolean;
  errorCode: string | null;
  /** Not in MA-139 §7's minimal sketch, but FR-5 requires "the failed rows
   * and their reasons listed" — a human-readable per-row message is the
   * natural extension of the errorCode already there. Falls back to a
   * client-side errorCode->message mapping (see utils/customerErrors.ts)
   * when absent, so the UI never has to show a bare error code. */
  message?: string | null;
}

export interface BulkCustomerStatusResponseData {
  results: BulkCustomerStatusResultItem[];
}

/** Error-code taxonomy for the MA-139 customer-management endpoints —
 * distinct from AdminErrorCode (MA-129 admin-staff endpoints), since these
 * are two different backend services/contracts. */
export const CustomerErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
} as const;

/**
 * Types for the MA-151 Admin Inventory Management admin API contract.
 *
 * Authoritative source is MA-150 (Inventory Service's 3 new endpoints,
 * transitively MA-118/MA-119) - see
 * specs/portal-ui/tasks/MA/MA-48/MA-151.md section 7/8: "this spec's DTOs must be
 * kept in sync with them during implementation." Modeled directly on that
 * spec's section 7 JSON, following this file's existing naming convention
 * (AdminUser/CustomerAccount, etc.) rather than inventing a new one.
 */

export type StockState = 'IN_STOCK' | 'OUT_OF_STOCK' | 'AVAILABLE_FROM';

export interface InventoryItem {
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
  stockState: StockState;
  lowStockThreshold: number;
}

// ---- GET /v1/inventory/{productId}/batches ----
export interface StockBatch {
  batchId: string;
  quantity: number;
  /** ISO-8601 date (YYYY-MM-DD). */
  expiryDate: string;
  /** ISO-8601 date (YYYY-MM-DD), or null when already available. */
  availableFrom: string | null;
  /** ISO-8601 timestamp. */
  receivedAt: string;
}

export type InventoryAuditActionType = 'ADJUST' | 'RECEIVE';

// ---- GET /v1/inventory/{productId}/audit-log ----
// Shape deliberately mirrors CustomerStatusHistoryEntry (previous/new
// value, reason, actor, timestamp) per MA-151 FR-3: "reusing the exact
// table shape CustomerDetailPage's status-history table already
// established" - the who/what/when/why columns are the same idea, applied
// to a quantity instead of a status.
export interface InventoryAuditLogEntry {
  actionType: InventoryAuditActionType;
  previousOnHand: number;
  newOnHand: number;
  quantityDelta: number;
  reason: string | null;
  actorAdminId: string;
  createdAt: string;
}

// ---- GET /v1/inventory ----
export interface ListInventoryResponseData {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListStockBatchesResponseData {
  batches: StockBatch[];
}

export interface ListInventoryAuditLogResponseData {
  entries: InventoryAuditLogEntry[];
}

// ---- PATCH /v1/inventory ---- (MA-119 FR-1)
export interface AdjustInventoryRequest {
  productId: string;
  /** Signed: positive to add, negative to remove/report spoilage (FR-4). */
  quantityDelta: number;
  reason: string;
}

// ---- POST /v1/inventory/receive ---- (MA-150)
export interface ReceiveStockRequest {
  productId: string;
  /** Positive integer. */
  quantity: number;
  /** ISO-8601 date; must be a future date (FR-5, validated client-side
   * before submit - final validation authority is still the backend). */
  expiryDate: string;
  reason?: string;
}

export interface ReceiveStockResponseData {
  batchId: string;
  productId: string;
  quantity: number;
  expiryDate: string;
  stock: {
    onHand: number;
    reserved: number;
    available: number;
  };
}

/** Error-code taxonomy for the MA-150/MA-119 inventory endpoints -
 * distinct from AdminErrorCode/CustomerErrorCode, since this is a third,
 * separate backend service/contract. ON_HAND_NEGATIVE and
 * AVAILABLE_NEGATIVE are two distinct codes (not one generic
 * VALIDATION_ERROR) because MA-119 FR-1 defines them as two distinct
 * floor-at-zero checks with two distinct admin-facing explanations (FR-4/
 * section 9/10) - collapsing them back into one code client-side would silently
 * re-introduce the generic-error problem the spec explicitly calls out. */
export const InventoryErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ON_HAND_NEGATIVE: 'ON_HAND_NEGATIVE',
  AVAILABLE_NEGATIVE: 'AVAILABLE_NEGATIVE',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
} as const;
