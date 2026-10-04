import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/login/LoginPage';
import TwoFactorPage from './pages/login/TwoFactorPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminUsersPage from './pages/admin-users/AdminUsersPage';
import CustomerAccountsPage from './pages/customer-accounts/CustomerAccountsPage';
import CustomerDetailPage from './pages/customer-accounts/CustomerDetailPage';
import InventoryListPage from './pages/inventory/InventoryListPage';
import InventoryDetailPage from './pages/inventory/InventoryDetailPage';
import ForbiddenPage from './pages/forbidden/ForbiddenPage';
import AppLayout from './components/layout/AppLayout';
import { RequireAuth, RequireRole, RequireSuperAdmin } from './routes/guards';

export default function App() {
  return (
    <Routes>
      {/* Unauthenticated route group */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/2fa" element={<TwoFactorPage />} />

      {/* Authenticated route group */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route
          path="/admin-users"
          element={
            <RequireSuperAdmin>
              <AdminUsersPage />
            </RequireSuperAdmin>
          }
        />
        {/* FR-1: Ops + SuperAdmin only (§12 Q1 proposal) — distinct route
            prefix from /admin-users per §9's naming-collision guard. */}
        <Route
          path="/customer-accounts"
          element={
            <RequireRole roles={['Ops', 'SuperAdmin']}>
              <CustomerAccountsPage />
            </RequireRole>
          }
        />
        <Route
          path="/customer-accounts/:id"
          element={
            <RequireRole roles={['Ops', 'SuperAdmin']}>
              <CustomerDetailPage />
            </RequireRole>
          }
        />
        {/* FR-1: Ops + SuperAdmin only, identical gate to Customer
            Accounts above - spec section 4 explicitly defers re-opening
            MA-141 section 12 Q1's role-split question, recording the same
            answer consistently here rather than re-litigating it. */}
        <Route
          path="/inventory"
          element={
            <RequireRole roles={['Ops', 'SuperAdmin']}>
              <InventoryListPage />
            </RequireRole>
          }
        />
        <Route
          path="/inventory/:productId"
          element={
            <RequireRole roles={['Ops', 'SuperAdmin']}>
              <InventoryDetailPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
