import { createContext, ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AdminRole } from '../api/types';
import { setAccessTokenGetter, setOnSessionExpired } from '../api/client';

const ACCESS_TOKEN_STORAGE_KEY = 'portal-ui.accessToken';
const ID_TOKEN_STORAGE_KEY = 'portal-ui.idToken';

interface DecodedAdminToken {
  sub: string;
  email: string;
  'cognito:groups': AdminRole[];
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: AdminRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  /** True once the initial token-from-storage check has completed. */
  initializing: boolean;
  /** Set after JWT expiry/403-role-change forces a redirect, cleared on next login attempt. */
  sessionMessage: string | null;
  setSession: (accessToken: string, idToken: string) => void;
  clearSession: (message?: string) => void;
  clearSessionMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Decodes the ID token specifically, never the access token — confirmed
 * against the real backend that Cognito access tokens carry `sub` and
 * `cognito:groups` but NOT `email` (that's an identity/profile claim,
 * only on the ID token; access tokens are scoped to authorization only,
 * standard OIDC separation). Using the access token here previously
 * rendered "Welcome, undefined" — `user.email` was always undefined
 * against the real backend, since the API-authorization token this app
 * already needed for every request never had it. The ID token carries
 * everything the access token does (sub, cognito:groups) plus email, so
 * deriving the whole `AuthUser` from it exclusively is a strict
 * superset, not a second source of truth to keep in sync. */
function decodeUser(idToken: string): AuthUser | null {
  try {
    const decoded = jwtDecode<DecodedAdminToken>(idToken);
    const role = decoded['cognito:groups']?.[0];
    if (!role) return null;
    if (decoded.exp * 1000 < Date.now()) return null;
    return { id: decoded.sub, email: decoded.email, role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // accessToken: attached to every API call's Authorization header,
  // never decoded for display — it's an opaque authorization credential
  // as far as this app's own UI is concerned.
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // idToken: never sent to the API — decoded locally, below, purely to
  // derive `user` for display/role-gating purposes.
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // Derived, not separate state — see decodeUser's own docstring for why
  // this reads idToken, not accessToken. Also avoids the original
  // failure mode this pattern was chosen for: a future 4th place that
  // updates the tokens (e.g. a silent-refresh handler) can't forget to
  // separately update `user`, since there's nothing separate to update.
  const user = useMemo<AuthUser | null>(() => (idToken ? decodeUser(idToken) : null), [idToken]);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    const storedIdToken = localStorage.getItem(ID_TOKEN_STORAGE_KEY);
    if (storedAccessToken && storedIdToken && decodeUser(storedIdToken)) {
      setAccessToken(storedAccessToken);
      setIdToken(storedIdToken);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      localStorage.removeItem(ID_TOKEN_STORAGE_KEY);
    }
    setInitializing(false);
  }, []);

  const clearSession = useCallback((message?: string) => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ID_TOKEN_STORAGE_KEY);
    setAccessToken(null);
    setIdToken(null);
    if (message) setSessionMessage(message);
  }, []);

  const setSession = useCallback((newAccessToken: string, newIdToken: string) => {
    if (!decodeUser(newIdToken)) {
      // An ID token that doesn't decode to a usable AuthUser (malformed,
      // missing/empty `cognito:groups` role claim, or already expired)
      // must not be persisted — storing it anyway would leave both
      // tokens set while the derived `user` above is null: RequireAuth
      // bounces to /login, but the unusable tokens would remain in
      // localStorage and keep getting attached/decoded on every
      // subsequent request/render.
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      localStorage.removeItem(ID_TOKEN_STORAGE_KEY);
      setAccessToken(null);
      setIdToken(null);
      setSessionMessage('Something went wrong signing you in. Please try again.');
      return;
    }
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, newAccessToken);
    localStorage.setItem(ID_TOKEN_STORAGE_KEY, newIdToken);
    setAccessToken(newAccessToken);
    setIdToken(newIdToken);
    setSessionMessage(null);
  }, []);

  // useLayoutEffect, not useEffect: on a fresh page load, `initializing`
  // flips to false and `accessToken` becomes non-null in the SAME
  // commit that first unblocks RequireAuth's children — unlike the
  // login->navigate flow, where that update and the target page's mount
  // happen in two separate commits. React runs a commit's passive
  // effects (useEffect) child-before-parent, so a plain useEffect here
  // could lose the race against a deeply-nested child's own mount-time
  // fetch (e.g. useAdminUsersQuery): the child's request would dispatch
  // and read client.ts's still-stale (null) token getter before this
  // effect ever ran, sending the request with no Authorization header
  // at all. Layout effects across an entire commit all run before any
  // passive effect in that same commit does, regardless of tree depth —
  // switching to useLayoutEffect closes that window entirely.
  useLayoutEffect(() => {
    setAccessTokenGetter(() => accessToken);
  }, [accessToken]);

  useEffect(() => {
    setOnSessionExpired(() => {
      clearSession('Your session expired. Please log in again.');
    });
    return () => {
      setOnSessionExpired(null);
    };
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      initializing,
      sessionMessage,
      setSession,
      clearSession,
      clearSessionMessage: () => setSessionMessage(null),
    }),
    [user, accessToken, initializing, sessionMessage, setSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
