import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

// ── Auth pages ─────────────────────────────────────────────
import LoginPage           from './pages/LoginPage';
import RegisterPage        from './pages/RegisterPage';
import VerifyOTPPage       from './pages/VerifyOTPPage';
import ForgotPasswordPage  from './pages/ForgotPasswordPage';
import ResetPasswordPage   from './pages/ResetPasswordPage';
import UnauthorizedPage    from './pages/UnauthorizedPage';

// ── Admin pages ────────────────────────────────────────────
import AdminDashboardPage  from './pages/admin/AdminDashboardPage';
import DeliveryRoutesPage  from './pages/admin/DeliveryRoutesPage';
import ProductsPage        from './pages/admin/ProductsPage';
import AlertsPage          from './pages/admin/AlertsPage';
import CarbonFootprintPage from './pages/admin/CarbonFootprintPage';
import EcoScorePage        from './pages/admin/EcoScorePage';
import ManagerPage         from './pages/ManagerPage';

// ── Manager pages ──────────────────────────────────────────
import InventoryManagerPage      from './pages/manager/inventory/InventoryManagerPage';
import LogisticsManagerPage      from './pages/manager/logistics/LogisticsManagerPage';
import SustainabilityManagerPage from './pages/manager/sustainability/SustainabilityManagerPage';

// ── Role dashboards ────────────────────────────────────────
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';
import DriverDashboard     from './pages/dashboards/DriverDashboard';

// ── Providers + utils ──────────────────────────────────────
import { AuthProvider }         from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ApprovalProvider }     from './context/ApprovalContext';
import { BusinessProvider }     from './context/BusinessContext';
import { useAuth }              from './hooks/useAuth';
import { getDashboardRoute }    from './utils/rolePermissions';
import ProtectedRoute           from './components/shared/ProtectedRoute';

// ── Smart redirect based on role ───────────────────────────
const DashboardRedirect = () => {
  const { loading, role, isAuthenticated } = useAuth();
  if (loading)          return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardRoute(role)} replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* ── Public ─────────────────────────────────────────── */}
    <Route path="/"                       element={<Navigate to="/login" replace />} />
    <Route path="/login"                  element={<LoginPage />} />
    <Route path="/register"               element={<RegisterPage />} />
    <Route path="/verify-otp"             element={<VerifyOTPPage />} />
    <Route path="/forgot-password"        element={<ForgotPasswordPage />} />
    <Route path="/reset-password/:token"  element={<ResetPasswordPage />} />
    <Route path="/unauthorized"           element={<UnauthorizedPage />} />

    {/* ── Smart dashboard redirect ────────────────────────── */}
    <Route path="/dashboard" element={<DashboardRedirect />} />

    {/* ── Role dashboards ────────────────────────────────── */}
    <Route path="/dashboard/super-admin" element={
      <ProtectedRoute requiredRole="super_admin" element={<SuperAdminDashboard />} />
    } />
    <Route path="/dashboard/admin" element={
      <ProtectedRoute requiredRole="admin" element={<AdminDashboardPage />} />
    } />
    <Route path="/dashboard/inventory-manager" element={
      <ProtectedRoute requiredRole="inventory_manager" element={<InventoryManagerPage />} />
    } />
    <Route path="/dashboard/logistics-manager" element={
      <ProtectedRoute requiredRole="logistics_manager" element={<LogisticsManagerPage />} />
    } />

    {/* ── Sustainability Manager — base + sub-routes ──────── */}
    <Route path="/dashboard/sustainability-manager" element={
      <ProtectedRoute requiredRole="sustainability_manager" element={<SustainabilityManagerPage />} />
    } />
    <Route path="/sustainability-manager/history" element={<Navigate to="/dashboard/sustainability-manager?tab=history" replace />} 
    />
    <Route path="/dashboard/sustainability-manager/history" element={
      <ProtectedRoute requiredRole="sustainability_manager" element={<SustainabilityManagerPage />} />
    } />

    <Route path="/dashboard/driver" element={
      <ProtectedRoute requiredRole="driver" element={<DriverDashboard />} />
    } />

    {/* ── Admin sub-pages ─────────────────────────────────── */}
    <Route path="/products"   element={<ProtectedRoute requiredRole="admin" element={<ProductsPage />} />} />
    <Route path="/deliveries" element={<ProtectedRoute requiredRole="admin" element={<DeliveryRoutesPage />} />} />
    <Route path="/alerts"     element={<ProtectedRoute requiredRole="admin" element={<AlertsPage />} />} />
    <Route path="/carbon"     element={
      <ProtectedRoute requiredRole={['admin', 'sustainability_manager']} element={<CarbonFootprintPage />} />
    } />
    <Route path="/managers"   element={<ProtectedRoute requiredRole="admin" element={<ManagerPage />} />} />
    <Route path="/ecoscore"   element={<ProtectedRoute requiredRole="admin" element={<EcoScorePage />} />} />

    {/* ── Legacy redirects ────────────────────────────────── */}
    <Route path="/inventory-manager"              element={<Navigate to="/dashboard/inventory-manager" replace />} />
    <Route path="/logistics-manager"              element={<Navigate to="/dashboard/logistics-manager" replace />} />
    <Route path="/sustainability-manager"         element={<Navigate to="/dashboard/sustainability-manager" replace />} />
    <Route path="/sustainability-manager/history" element={<Navigate to="/dashboard/sustainability-manager/history" replace />} />
    <Route path="/superadmin/*"                   element={<Navigate to="/dashboard/super-admin" replace />} />
    <Route path="/driver"                         element={<Navigate to="/dashboard/driver" replace />} />

    {/* ── 404 fallback ────────────────────────────────────── */}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ApprovalProvider>
          <BusinessProvider>
            <Router>
              <AppRoutes />
            </Router>
          </BusinessProvider>
        </ApprovalProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;