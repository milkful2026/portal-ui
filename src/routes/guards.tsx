import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AdminRole } from '../api/types';
import { useAuth } from '../auth/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/** Denies by default: a missing `user` is treated the same as a
 * disallowed role, not as "nothing to check yet". The previous
 * `user && user.role !== ...` form only denied when a user WAS present
 * and had the wrong role — a null/undefined user fell through to
 * rendering children, which happened to be safe only because this is
 * always mounted beneath RequireAuth today. A guard should fail closed
 * on its own, not rely on being composed correctly by every caller. */
export function RequireRole({ roles, children }: { roles: AdminRole[]; children: ReactNode }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  return <RequireRole roles={['SuperAdmin']}>{children}</RequireRole>;
}
