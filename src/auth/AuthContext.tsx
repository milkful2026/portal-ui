import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AdminRole } from '../api/types';
import { setAccessTokenGetter, setOnAccessRevoked, setOnSessionExpired } from '../api/client';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const decoded = decodeUser(stored);
      if (decoded) {
        setAccessToken(stored);
        setUser(decoded);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setInitializing(false);
  }, []);

  const clearSession = useCallback((message?: string) => {
    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setUser(null);
    if (message) setSessionMessage(message);
  }, []);

  const setSession = useCallback((token: string) => {
    const decoded = decodeUser(token);
    localStorage.setItem(STORAGE_KEY, token);
    setAccessToken(token);
    setUser(decoded);
    setSessionMessage(null);
  }, []);

  useEffect(() => {
    setAccessTokenGetter(() => accessToken);
  }, [accessToken]);

  useEffect(() => {
    setOnSessionExpired(() => {
      clearSession('Your session expired. Please log in again.');
    });
    setOnAccessRevoked(() => {
      clearSession('Your access has changed. Please log in again.');
    });
    return () => {
      setOnSessionExpired(null);
      setOnAccessRevoked(null);
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
