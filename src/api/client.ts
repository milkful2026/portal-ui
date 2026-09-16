import {
  ApiEnvelope,
  ApiError,
  CreateAdminUserRequest,
  AdminUser,
  ListAdminUsersResponseData,
  LoginRequest,
  LoginResponseData,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponseData,
  UpdateAdminUserRequest,
} from './types';

const BASE_URL = '/v1';

/** Session-expiry hook, wired up by AuthContext so the client can trigger a
 * redirect-to-login without a circular import. */
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: (() => void) | null) {
  onSessionExpired = cb;
}

/** §9: "Admin deactivates their own session's role ... mid-session. Next API
 * call returns 403; UI redirects to login." Distinct from an ordinary
 * permission-denied 403 (e.g. a non-SuperAdmin hitting a SuperAdmin-only
 * endpoint), which should show a toast, not force a logout. MA-129 is the
 * source of truth for the exact error code; ACCESS_REVOKED is this UI's
 * assumption pending that contract, flagged as a resolved ambiguity. */
let onAccessRevoked: (() => void) | null = null;
export function setOnAccessRevoked(cb: (() => void) | null) {
  onAccessRevoked = cb;
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
    if (response.status === 403 && body?.status === 'error' && body.error.code === 'ACCESS_REVOKED') {
      onAccessRevoked?.();
    }
    if (body && body.status === 'error') {
      throw new ApiError(body.error.code, body.error.message, response.status);
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
