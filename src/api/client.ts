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
