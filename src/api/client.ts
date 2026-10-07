import {
  AdjustInventoryRequest,
  ApiEnvelope,
  ApiError,
  BulkCustomerStatusRequest,
  BulkCustomerStatusResponseData,
  CreateAdminUserRequest,
  AdminUser,
  CustomerAccount,
  CustomerAccountDetail,
  DeactivateCustomerRequest,
  InventoryItem,
  ListAdminUsersResponseData,
  ListCustomerAccountsResponseData,
  ListInventoryAuditLogResponseData,
  ListInventoryResponseData,
  ListStockBatchesResponseData,
  LoginRequest,
  LoginResponseData,
  ReactivateCustomerRequest,
  ReceiveStockRequest,
  ReceiveStockResponseData,
  StockState,
  SuspendCustomerRequest,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponseData,
  UpdateAdminUserRequest,
} from './types';

const BASE_URL = '/v1';

/** Session-expiry hook, wired up by AuthContext so the client can trigger a
 * redirect-to-login without a circular import. Fires on any 401
 * (UNAUTHENTICATED) — including the case this used to special-case as a
 * separate "ACCESS_REVOKED" 403 (a code the real backend never emits: its
 * documented behavior is that an already-issued access token stays valid
 * until natural JWT expiry — see MA-129 §9 / user_service.py's own
 * docstring — so there is no immediate 403 to react to on a mid-session
 * role change or deactivation). A 403 from a real permission check
 * (FORBIDDEN) is handled below as an ordinary error, not a forced logout,
 * per services/README.md §5c's 401→re-authenticate / 403→permission-denied
 * mapping. */
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: (() => void) | null) {
  onSessionExpired = cb;
}

let getAccessToken: () => string | null = () => null;
export function setAccessTokenGetter(fn: () => string | null) {
  getAccessToken = fn;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  opts: { auth?: boolean } = { auth: true },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (opts.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('NETWORK_ERROR', "Couldn't reach the server. Check your connection and try again.", 0);
  }

  if (response.status === 401 && opts.auth !== false) {
    onSessionExpired?.();
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // no body (e.g. some 204s) — fall through
  }

  if (!response.ok) {
    if (body && body.status === 'error') {
      throw new ApiError(body.data.errorCode, body.data.message, response.status);
    }
    if (response.status === 403) {
      throw new ApiError('FORBIDDEN', 'Permission denied', 403);
    }
    if (response.status >= 500) {
      throw new ApiError('SERVER_ERROR', 'Something went wrong. Try again.', response.status);
    }
    throw new ApiError('UNKNOWN_ERROR', 'Something went wrong. Try again.', response.status);
  }

  if (body && body.status === 'success') {
    return body.data;
  }

  return undefined as unknown as T;
}

export const authApi = {
  login: (payload: LoginRequest) =>
    request<LoginResponseData>(
      '/admin/auth/login',
      { method: 'POST', body: JSON.stringify(payload) },
      { auth: false },
    ),
  verify2fa: (payload: TwoFactorVerifyRequest) =>
    request<TwoFactorVerifyResponseData>(
      '/admin/auth/2fa/verify',
      { method: 'POST', body: JSON.stringify(payload) },
      { auth: false },
    ),
};

export const adminUsersApi = {
  list: () => request<ListAdminUsersResponseData>('/admin/users', { method: 'GET' }),
  create: (payload: CreateAdminUserRequest) =>
    request<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: UpdateAdminUserRequest) =>
    request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deactivate: (id: string) =>
    request<AdminUser>(`/admin/users/${id}/deactivate`, { method: 'POST' }),
  reactivate: (id: string) =>
    request<AdminUser>(`/admin/users/${id}/reactivate`, { method: 'POST' }),
};

// MA-139 (User Service) customer-account-management endpoints — see
// specs/portal-ui/tasks/MA/MA-39/MA-141.md §4/§6.
export const customerAccountsApi = {
  list: () => request<ListCustomerAccountsResponseData>('/admin/customers', { method: 'GET' }),
  get: (id: string) => request<CustomerAccountDetail>(`/admin/customers/${id}`, { method: 'GET' }),
  suspend: (id: string, payload: SuspendCustomerRequest) =>
    request<CustomerAccount>(`/admin/customers/${id}/suspend`, { method: 'POST', body: JSON.stringify(payload) }),
  deactivate: (id: string, payload: DeactivateCustomerRequest) =>
    request<CustomerAccount>(`/admin/customers/${id}/deactivate`, { method: 'POST', body: JSON.stringify(payload) }),
  reactivate: (id: string, payload: ReactivateCustomerRequest) =>
    request<CustomerAccount>(`/admin/customers/${id}/reactivate`, { method: 'POST', body: JSON.stringify(payload) }),
  bulkStatus: (payload: BulkCustomerStatusRequest) =>
    request<BulkCustomerStatusResponseData>('/admin/customers/bulk-status', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// MA-150/MA-119 (Inventory Service) admin inventory-management endpoints -
// see specs/portal-ui/tasks/MA/MA-48/MA-151.md section 4/6. Paths are
// '/inventory...', not '/admin/inventory...' - this spec's own section 6
// table lists the real paths as '/v1/inventory', '/v1/inventory/receive',
// etc, unlike the '/admin/customers' and '/admin/users' prefixes the two
// earlier services use.
export const inventoryApi = {
  list: (stockState?: StockState | 'All') =>
    request<ListInventoryResponseData>(
      `/inventory${stockState && stockState !== 'All' ? `?stockState=${stockState}` : ''}`,
      { method: 'GET' },
    ),
  getDetail: (productId: string) => request<InventoryItem>(`/inventory/${productId}`, { method: 'GET' }),
  getBatches: (productId: string) =>
    request<ListStockBatchesResponseData>(`/inventory/${productId}/batches`, { method: 'GET' }),
  // pageSize=500 - the backend's own declared max (admin_inventory_
  // handler.py's `Query(default=50, ge=1, le=500)`) - rather than its
  // default 50, so a product's full audit history loads in one call for
  // any realistic admin-adjustment/receipt volume. Not real pagination
  // (no page param, no "load more"): see InventoryDetailPage.tsx's own
  // handling of `total` for what happens on the rare product that
  // exceeds even this.
  getAuditLog: (productId: string) =>
    request<ListInventoryAuditLogResponseData>(`/inventory/${productId}/audit-log?pageSize=500`, {
      method: 'GET',
    }),
  adjust: (payload: AdjustInventoryRequest) =>
    request<InventoryItem>('/inventory', { method: 'PATCH', body: JSON.stringify(payload) }),
  receive: (payload: ReceiveStockRequest) =>
    request<ReceiveStockResponseData>('/inventory/receive', { method: 'POST', body: JSON.stringify(payload) }),
};
