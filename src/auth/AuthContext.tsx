import { createContext, ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AdminRole } from '../api/types';
import { setAccessTokenGetter, setOnSessionExpired } from '../api/client';

const STORAGE_KEY = 'portal-ui.accessToken';

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
  setSession: (accessToken: string) => void;
  clearSession: (message?: string) => void;
  clearSessionMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeUser(token: string): AuthUser | null {
  try {
    const decoded = jwtDecode<DecodedAdminToken>(token);
    const role = decoded['cognito:groups']?.[0];
    if (!role) return null;
    if (decoded.exp * 1000 < Date.now()) return null;
    return { id: decoded.sub, email: decoded.email, role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // Derived, not separate state: `user` is always exactly
  // `decodeUser(accessToken)`. Previously these were two independent
  // `useState`s kept in sync by hand across 3 call sites (init effect,
  // setSession, clearSession) — a future 4th place that updates
  // accessToken (e.g. a silent-refresh handler) could easily forget to
  // also update `user`, leaving the UI showing a stale identity while
  // the token itself had changed. Deriving removes that failure mode
  // entirely rather than relying on remembering to keep them in sync.
  const user = useMemo<AuthUser | null>(() => (accessToken ? decodeUser(accessToken) : null), [accessToken]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      if (decodeUser(stored)) {
        setAccessToken(stored);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setInitializing(false);
  }, []);

  const clearSession = useCallback((message?: string) => {
    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    if (message) setSessionMessage(message);
  }, []);

  const setSession = useCallback((token: string) => {
    if (!decodeUser(token)) {
      // A token that doesn't decode to a usable AuthUser (malformed,
      // missing/empty `cognito:groups` role claim, or already expired)
      // must not be persisted — storing it anyway would leave
      // `accessToken` truthy while the derived `user` above is null:
      // RequireAuth bounces to /login, but the unusable token would
      // remain in localStorage and keep getting attached as
      // `Authorization: Bearer …` on every subsequent request.
      localStorage.removeItem(STORAGE_KEY);
      setAccessToken(null);
      setSessionMessage('Something went wrong signing you in. Please try again.');
      return;
    }
    localStorage.setItem(STORAGE_KEY, token);
    setAccessToken(token);
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
