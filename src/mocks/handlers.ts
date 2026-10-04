import { http, HttpResponse } from 'msw';
import {
  adminUsers,
  appendCustomerHistory,
  appendProductAuditEntry,
  appendProductBatch,
  customerAccounts,
  findByEmail,
  findById,
  findCustomerById,
  findInventoryRecord,
  getCustomerHistory,
  getProductAuditLog,
  getProductBatches,
  inventoryRecords,
  MOCK_PASSWORD,
  MOCK_TOTP_CODE,
  nextBatchId,
  nextId,
} from './db';
import { buildMockJwt } from './jwt';
import { resolveCustomerTransition } from '../utils/customerTransitions';
import { isFutureDate } from '../utils/futureDate';
import { checkAdjustmentFloor, computeAvailable, computeStockState } from '../utils/inventoryAdjustment';
import {
  AdjustInventoryRequest,
  AdminErrorCode,
  AdminRole,
  AdminUser,
  BulkCustomerAction,
  BulkCustomerStatusRequest,
  BulkCustomerStatusResultItem,
  CreateAdminUserRequest,
  CustomerAccount,
  CustomerErrorCode,
  CustomerStatus,
  DeactivateCustomerRequest,
  InventoryErrorCode,
  InventoryItem,
  LoginRequest,
  ReactivateCustomerRequest,
  ReceiveStockRequest,
  StockBatch,
  SuspendCustomerRequest,
  TwoFactorVerifyRequest,
  UpdateAdminUserRequest,
} from '../api/types';
import { InventoryRecord } from './db';

function ok<T>(data: T, status = 200) {
  return HttpResponse.json({ requestId: crypto.randomUUID(), status: 'success', data }, { status });
}

function fail(errorCode: string, message: string, status: number) {
  return HttpResponse.json(
    { requestId: crypto.randomUUID(), status: 'error', data: { errorCode, message } },
    { status },
  );
}

/** Every /v1/admin/users* route sits behind the real admin authorizer
 * (admin_authorizer_handler.py), which denies with 401 UNAUTHENTICATED
 * when no Bearer token is present at all. This mock previously didn't
 * check for one on any of these routes — a code-review verification
 * agent caught that the resulting false-negative risk meant
 * admin-users-refresh.spec.ts (the regression test for a real missing-
 * Authorization-header race condition) could pass even with the race
 * reintroduced, since the mock would return 200 either way. Returns the
 * 401 response to send, or null if a token is present (this mock does
 * not decode/validate it further — that's what buildMockJwt's own
 * shape already guarantees for tokens this app itself issued). */
function requireAuth(request: Request): Response | null {
  const header = request.headers.get('Authorization') ?? request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ') || header.slice(7).trim() === '') {
    return fail(AdminErrorCode.UNAUTHENTICATED, 'Authentication required', 401);
  }
  return null;
}

/** Decodes the sub/role claims out of this mock's own unsigned JWT
 * (buildMockJwt's shape — header.payload.signature, base64url,
 * `cognito:groups[0]` is the role). Not a real JWT verifier; only ever fed
 * tokens this app itself issued, same trust boundary as requireAuth above. */
function decodeMockJwt(request: Request): { sub: string; role: AdminRole } | null {
  const header = request.headers.get('Authorization') ?? request.headers.get('authorization');
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return null;
  try {
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { sub?: string; 'cognito:groups'?: AdminRole[] };
    const role = payload['cognito:groups']?.[0];
    if (!payload.sub || !role) return null;
    return { sub: payload.sub, role };
  } catch {
    return null;
  }
}

/** Customer-account endpoints require a valid Bearer token AND the FR-1
 * role gate (Ops + SuperAdmin) — per spec §5 "enforced server-side (client-
 * side hiding is UX only, never the authorization boundary)". Mirrors
 * requireAuth's "return the response to send, or null" shape. */
function requireCustomerRole(request: Request): Response | null {
  const authError = requireAuth(request);
  if (authError) return authError;
  const decoded = decodeMockJwt(request);
  if (!decoded || !(['Ops', 'SuperAdmin'] as AdminRole[]).includes(decoded.role)) {
    return fail(CustomerErrorCode.FORBIDDEN, 'Permission denied', 403);
  }
  return null;
}

/** Inventory endpoints require a valid Bearer token AND the FR-1 role gate
 * (Ops + SuperAdmin) - identical posture to requireCustomerRole above, per
 * spec section 5 "enforced server-side (client-side hiding is UX only,
 * never the authorization boundary)". This repo has twice now shipped a
 * mock that skipped this kind of check and let a real bug through
 * undetected (see requireAuth's own docstring) - not repeating that here. */
function requireInventoryRole(request: Request): Response | null {
  const authError = requireAuth(request);
  if (authError) return authError;
  const decoded = decodeMockJwt(request);
  if (!decoded || !(['Ops', 'SuperAdmin'] as AdminRole[]).includes(decoded.role)) {
    return fail(InventoryErrorCode.FORBIDDEN, 'Permission denied', 403);
  }
  return null;
}

/** Builds the API-facing InventoryItem from the mutable DB record plus its
 * batches - `available`/`stockState` are ALWAYS derived here, never read
 * off a stored (and therefore staleable) field. See db.ts's own docstring
 * for why. */
function toInventoryItem(record: InventoryRecord): InventoryItem {
  const batches = getProductBatches(record.productId);
  const available = computeAvailable(record.onHand, record.reserved, batches);
  const stockState = computeStockState(available, batches);
  return {
    productId: record.productId,
    onHand: record.onHand,
    reserved: record.reserved,
    available,
    stockState,
    lowStockThreshold: record.lowStockThreshold,
  };
}

const VALID_BULK_ACTIONS: BulkCustomerAction[] = ['suspend', 'deactivate', 'reactivate'];

/** `body.action` comes straight off the wire (`as BulkCustomerStatusRequest`
 * is a compile-time-only assertion, not a runtime guarantee) — an
 * unrecognized value must be rejected explicitly rather than falling
 * through applyCustomerTransition's newStatus ternary to a default
 * behavior (previously: silently reactivating the account). */
function isValidBulkAction(action: unknown): action is BulkCustomerAction {
  return typeof action === 'string' && (VALID_BULK_ACTIONS as string[]).includes(action);
}

/** Applies an already-validated ('apply' outcome) status transition:
 * mutates the customer record and appends exactly one history row. Callers
 * must consult resolveCustomerTransition (customerTransitions.ts) first —
 * an 'error' outcome must be rejected with a 409 before reaching here, and
 * a 'noop' outcome must skip this function entirely (MA-139 FR-4's
 * idempotent-deactivate and the mirrored idempotent-reactivate-on-Active
 * case both require no duplicate history row on the no-op path, §9). */
function applyCustomerTransition(
  customer: CustomerAccount,
  action: BulkCustomerAction,
  reason: string | null,
  until: string | null,
  actorAdminId: string,
): CustomerAccount {
  const previousStatus = customer.status;
  const newStatus: CustomerStatus = action === 'suspend' ? 'Suspended' : action === 'deactivate' ? 'Deactivated' : 'Active';
  const now = new Date().toISOString();
  customer.status = newStatus;
  customer.statusReason = newStatus === 'Active' ? null : reason;
  customer.lastStatusChangeAt = now;
  appendCustomerHistory(customer.id, {
    previousStatus,
    newStatus,
    reason,
    effectiveFrom: until,
    actorAdminId,
    createdAt: now,
  });
  return customer;
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
    // email omitted here deliberately — see buildMockJwt's own docstring.
    const accessToken = buildMockJwt({ sub: user.id, role: user.role });
    return ok({
      accessToken,
      refreshToken: crypto.randomUUID(),
      idToken: buildMockJwt({ sub: user.id, email: user.email, role: user.role }),
      expiresIn: 900,
    });
  }),

  http.get('/v1/admin/users', ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;
    return ok({ items: adminUsers, total: adminUsers.length, page: 1, pageSize: adminUsers.length });
  }),

  http.post('/v1/admin/users', async ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;
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
    const authError = requireAuth(request);
    if (authError) return authError;
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

  http.post('/v1/admin/users/:id/deactivate', ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;
    const user = findById(params.id as string);
    if (!user) {
      return fail(AdminErrorCode.ADMIN_NOT_FOUND, 'Admin user not found', 404);
    }
    user.status = 'Deactivated';
    user.updatedAt = new Date().toISOString();
    return ok(user);
  }),

  http.post('/v1/admin/users/:id/reactivate', ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;
    const user = findById(params.id as string);
    if (!user) {
      return fail(AdminErrorCode.ADMIN_NOT_FOUND, 'Admin user not found', 404);
    }
    user.status = 'Active';
    user.updatedAt = new Date().toISOString();
    return ok(user);
  }),

  // ---- MA-141 Customer Account Management (MA-139 contract) ----

  http.get('/v1/admin/customers', ({ request }) => {
    const authError = requireCustomerRole(request);
    if (authError) return authError;
    return ok({ items: customerAccounts, total: customerAccounts.length, page: 1, pageSize: customerAccounts.length });
  }),

  http.get('/v1/admin/customers/:id', ({ request, params }) => {
    const authError = requireCustomerRole(request);
    if (authError) return authError;
    const customer = findCustomerById(params.id as string);
    if (!customer) {
      return fail(CustomerErrorCode.CUSTOMER_NOT_FOUND, 'Customer account not found', 404);
    }
    return ok({ ...customer, statusHistory: getCustomerHistory(customer.id) });
  }),

  http.post('/v1/admin/customers/:id/suspend', async ({ request, params }) => {
    const authError = requireCustomerRole(request);
    if (authError) return authError;
    const customer = findCustomerById(params.id as string);
    if (!customer) {
      return fail(CustomerErrorCode.CUSTOMER_NOT_FOUND, 'Customer account not found', 404);
    }
    const body = (await request.json()) as SuspendCustomerRequest;
    if (!body.reason?.trim() || !body.until) {
      return fail(CustomerErrorCode.VALIDATION_ERROR, 'Reason and an end date are required to suspend an account', 400);
    }
    // FR-3/§9: suspending an already-Suspended account is a real update
    // (until/reason change, new history row) — not idempotent-as-a-no-op.
    // Only suspending an already-Deactivated account is rejected (409):
    // must reactivate first.
    const transition = resolveCustomerTransition('suspend', customer.status);
    if (transition.kind === 'error') {
      return fail(CustomerErrorCode.INVALID_STATUS_TRANSITION, transition.message, 409);
    }
    const decoded = decodeMockJwt(request);
    const updated = applyCustomerTransition(customer, 'suspend', body.reason.trim(), body.until, decoded?.sub ?? 'admin-1');
    return ok(updated);
  }),

  http.post('/v1/admin/customers/:id/deactivate', async ({ request, params }) => {
    const authError = requireCustomerRole(request);
    if (authError) return authError;
    const customer = findCustomerById(params.id as string);
    if (!customer) {
      return fail(CustomerErrorCode.CUSTOMER_NOT_FOUND, 'Customer account not found', 404);
    }
    const body = (await request.json()) as DeactivateCustomerRequest;
    if (!body.reason?.trim()) {
      return fail(CustomerErrorCode.VALIDATION_ERROR, 'Reason is required to deactivate an account', 400);
    }
    // FR-4: deactivate is idempotent — an already-Deactivated account
    // returns 200 with the unchanged account (no duplicate history row,
    // no error). This endpoint never returns 409 (spec §6 workflow).
    const decoded = decodeMockJwt(request);
    const transition = resolveCustomerTransition('deactivate', customer.status);
    const updated =
      transition.kind === 'noop'
        ? customer
        : applyCustomerTransition(customer, 'deactivate', body.reason.trim(), null, decoded?.sub ?? 'admin-1');
    return ok(updated);
  }),

  http.post('/v1/admin/customers/:id/reactivate', async ({ request, params }) => {
    const authError = requireCustomerRole(request);
    if (authError) return authError;
    const customer = findCustomerById(params.id as string);
    if (!customer) {
      return fail(CustomerErrorCode.CUSTOMER_NOT_FOUND, 'Customer account not found', 404);
    }
    const body = (await request.json().catch(() => ({}))) as ReactivateCustomerRequest;
    // FR-5: reactivate has no 409 case at all. Reactivating an
    // already-Active account is idempotent (200, unchanged, no duplicate
    // history row); Suspended/Deactivated both apply normally.
    const decoded = decodeMockJwt(request);
    const transition = resolveCustomerTransition('reactivate', customer.status);
    const updated =
      transition.kind === 'noop'
        ? customer
        : applyCustomerTransition(
            customer,
            'reactivate',
            body.reason?.trim() || null,
            null,
            decoded?.sub ?? 'admin-1',
          );
    return ok(updated);
  }),

  http.post('/v1/admin/customers/bulk-status', async ({ request }) => {
    const authError = requireCustomerRole(request);
    if (authError) return authError;
    const body = (await request.json()) as BulkCustomerStatusRequest;
    const decoded = decodeMockJwt(request);

    if (!isValidBulkAction(body.action)) {
      return fail(CustomerErrorCode.VALIDATION_ERROR, `Unsupported bulk action: ${String(body.action)}`, 400);
    }

    if (body.action === 'suspend' && (!body.reason?.trim() || !body.until)) {
      return fail(CustomerErrorCode.VALIDATION_ERROR, 'Reason and an end date are required to suspend an account', 400);
    }
    if (body.action === 'deactivate' && !body.reason?.trim()) {
      return fail(CustomerErrorCode.VALIDATION_ERROR, 'Reason is required to deactivate an account', 400);
    }

    // §9 "Network failure mid-bulk-action": the UI only ever learns what the
    // server actually completed via this per-row array — nothing here is an
    // optimistic guess, each row is independently validated and applied
    // against the same state machine as the single-account endpoints above
    // (resolveCustomerTransition), so bulk and single behavior never drift.
    const results: BulkCustomerStatusResultItem[] = body.customerIds.map((customerId) => {
      const customer = findCustomerById(customerId);
      if (!customer) {
        return {
          customerId,
          success: false,
          errorCode: CustomerErrorCode.CUSTOMER_NOT_FOUND,
          message: 'Customer account no longer exists.',
        };
      }
      const transition = resolveCustomerTransition(body.action, customer.status);
      if (transition.kind === 'error') {
        return {
          customerId,
          success: false,
          errorCode: CustomerErrorCode.INVALID_STATUS_TRANSITION,
          message: transition.message,
        };
      }
      if (transition.kind === 'apply') {
        applyCustomerTransition(
          customer,
          body.action,
          body.reason?.trim() || null,
          body.until ?? null,
          decoded?.sub ?? 'admin-1',
        );
      }
      // transition.kind === 'noop': idempotent success, no mutation, no
      // duplicate history row — still reported as success: true, since
      // nothing about the request failed.
      return { customerId, success: true, errorCode: null };
    });

    return ok({ results });
  }),

  // ---- MA-151 Admin Inventory Management (MA-150/MA-119 contract) ----

  http.get('/v1/inventory', ({ request }) => {
    const authError = requireInventoryRole(request);
    if (authError) return authError;
    const url = new URL(request.url);
    const stockStateParam = url.searchParams.get('stockState');
    let items = inventoryRecords.map(toInventoryItem);
    if (stockStateParam) {
      items = items.filter((item) => item.stockState === stockStateParam);
    }
    return ok({ items, total: items.length, page: 1, pageSize: items.length });
  }),

  http.get('/v1/inventory/:productId/batches', ({ request, params }) => {
    const authError = requireInventoryRole(request);
    if (authError) return authError;
    const record = findInventoryRecord(params.productId as string);
    if (!record) {
      return fail(InventoryErrorCode.PRODUCT_NOT_FOUND, 'Product not found', 404);
    }
    // FR-3: oldest-expiry-first - matches MA-150 FR-2's own FIFO draw
    // order, so what the admin sees matches real draw order.
    const batches = [...getProductBatches(record.productId)].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    );
    return ok({ batches });
  }),

  http.get('/v1/inventory/:productId/audit-log', ({ request, params }) => {
    const authError = requireInventoryRole(request);
    if (authError) return authError;
    const record = findInventoryRecord(params.productId as string);
    if (!record) {
      return fail(InventoryErrorCode.PRODUCT_NOT_FOUND, 'Product not found', 404);
    }
    // Already stored newest-first (appendProductAuditEntry only ever
    // unshifts) - FR-3's "newest-first" audit-trail requirement.
    return ok({ entries: getProductAuditLog(record.productId) });
  }),

  // GET /v1/inventory/{productId} (aggregate detail, MA-118) - kept after
  // the two more specific /:productId/batches and /:productId/audit-log
  // routes above since MSW matches path patterns in registration order
  // and a bare '/:productId' would otherwise shadow them (same ordering
  // lesson vite.config.ts's own comment calls out for its proxy rules).
  http.get('/v1/inventory/:productId', ({ request, params }) => {
    const authError = requireInventoryRole(request);
    if (authError) return authError;
    const record = findInventoryRecord(params.productId as string);
    if (!record) {
      return fail(InventoryErrorCode.PRODUCT_NOT_FOUND, 'Product not found', 404);
    }
    return ok(toInventoryItem(record));
  }),

  http.patch('/v1/inventory', async ({ request }) => {
    const authError = requireInventoryRole(request);
    if (authError) return authError;
    const body = (await request.json()) as AdjustInventoryRequest;

    if (!body.reason?.trim()) {
      return fail(InventoryErrorCode.VALIDATION_ERROR, 'Reason is required to adjust stock.', 400);
    }
    if (!Number.isInteger(body.quantityDelta) || body.quantityDelta === 0) {
      return fail(InventoryErrorCode.VALIDATION_ERROR, 'Quantity must be a non-zero whole number.', 400);
    }

    const record = findInventoryRecord(body.productId);
    if (!record) {
      return fail(InventoryErrorCode.PRODUCT_NOT_FOUND, 'Product not found', 404);
    }

    // FR-4/section 9/10: the two floor-at-zero checks MUST stay two
    // distinct checks with two distinct messages - see
    // checkAdjustmentFloor's own docstring. Never collapse this into one
    // generic rejection.
    const batches = getProductBatches(record.productId);
    const check = checkAdjustmentFloor(record.onHand, record.reserved, body.quantityDelta, batches);
    if (!check.ok) {
      return fail(check.errorCode, check.message, 400);
    }

    const previousOnHand = record.onHand;
    record.onHand = previousOnHand + body.quantityDelta;
    const decoded = decodeMockJwt(request);
    appendProductAuditEntry(record.productId, {
      actionType: 'ADJUST',
      previousOnHand,
      newOnHand: record.onHand,
      quantityDelta: body.quantityDelta,
      reason: body.reason.trim(),
      actorAdminId: decoded?.sub ?? 'admin-1',
      createdAt: new Date().toISOString(),
    });

    return ok(toInventoryItem(record));
  }),

  http.post('/v1/inventory/receive', async ({ request }) => {
    const authError = requireInventoryRole(request);
    if (authError) return authError;
    const body = (await request.json()) as ReceiveStockRequest;

    if (!Number.isInteger(body.quantity) || body.quantity <= 0) {
      return fail(InventoryErrorCode.VALIDATION_ERROR, 'Quantity must be a positive whole number.', 400);
    }
    // FR-5/section 9: a past expiry date must be rejected here too (client
    // validation is UX only, never the authorization/validation boundary) -
    // reuses the exact isFutureDate check the Suspend dialog's "Until"
    // field already established, rather than inventing a second one.
    if (!body.expiryDate || !isFutureDate(body.expiryDate)) {
      return fail(InventoryErrorCode.VALIDATION_ERROR, 'Expiry date must be a future date.', 400);
    }

    const record = findInventoryRecord(body.productId);
    if (!record) {
      return fail(InventoryErrorCode.PRODUCT_NOT_FOUND, 'Product not found', 404);
    }

    const batchId = nextBatchId();
    const receivedAt = new Date().toISOString();
    const newBatch: StockBatch = {
      batchId,
      quantity: body.quantity,
      expiryDate: body.expiryDate,
      availableFrom: null,
      receivedAt,
    };
    appendProductBatch(record.productId, newBatch);

    const previousOnHand = record.onHand;
    record.onHand = previousOnHand + body.quantity;
    const decoded = decodeMockJwt(request);
    appendProductAuditEntry(record.productId, {
      actionType: 'RECEIVE',
      previousOnHand,
      newOnHand: record.onHand,
      quantityDelta: body.quantity,
      reason: body.reason?.trim() || null,
      actorAdminId: decoded?.sub ?? 'admin-1',
      createdAt: receivedAt,
    });

    const batches = getProductBatches(record.productId);
    const available = computeAvailable(record.onHand, record.reserved, batches);

    return ok(
      {
        batchId,
        productId: record.productId,
        quantity: body.quantity,
        expiryDate: body.expiryDate,
        stock: { onHand: record.onHand, reserved: record.reserved, available },
      },
      201,
    );
  }),
];
