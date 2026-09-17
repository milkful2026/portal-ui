import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/login/LoginPage';
import TwoFactorPage from './pages/login/TwoFactorPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminUsersPage from './pages/admin-users/AdminUsersPage';
import ForbiddenPage from './pages/forbidden/ForbiddenPage';
import AppLayout from './components/layout/AppLayout';
import { RequireAuth, RequireSuperAdmin } from './routes/guards';

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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
