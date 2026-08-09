import type React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardLayout } from './components/DashboardLayout';

// Super Admin pages
import { PlatformOverview } from './pages/admin/PlatformOverview';
import { StationsManagement } from './pages/admin/StationsManagement';
import { UsersManagement } from './pages/admin/UsersManagement';
import { RiderMonitoring } from './pages/admin/RiderMonitoring';
import { FinancialReporting } from './pages/admin/FinancialReporting';
import { DisputeResolution } from './pages/admin/DisputeResolution';
import { AuditLogs } from './pages/admin/AuditLogs';
import { CommissionManagement } from './pages/admin/CommissionManagement';
import { SystemSettings } from './pages/admin/SystemSettings';

// Station pages
import { StationOverview } from './pages/station/StationOverview';
import { StationOrders } from './pages/station/StationOrders';
import { StationInventory } from './pages/station/StationInventory';
import { StationPricing } from './pages/station/StationPricing';
import { StationRiders } from './pages/station/StationRiders';
import { StationCustomers } from './pages/station/StationCustomers';
import { StationRevenue } from './pages/station/StationRevenue';

const SUPER_ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const STATION_ROLES = ['STATION_STAFF', 'STATION_MANAGER'];

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleHome() {
  const user = useAuthStore((s) => s.user);
  if (user && STATION_ROLES.includes(user.role)) return <Navigate to="/station" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Super Admin Dashboard */}
      <Route path="/admin" element={<ProtectedRoute><DashboardLayout variant="admin" /></ProtectedRoute>}>
        <Route index element={<PlatformOverview />} />
        <Route path="stations" element={<StationsManagement />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="riders" element={<RiderMonitoring />} />
        <Route path="financials" element={<FinancialReporting />} />
        <Route path="disputes" element={<DisputeResolution />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="commission" element={<CommissionManagement />} />
        <Route path="settings" element={<SystemSettings />} />
      </Route>

      {/* Gas Station Dashboard */}
      <Route path="/station" element={<ProtectedRoute><DashboardLayout variant="station" /></ProtectedRoute>}>
        <Route index element={<StationOverview />} />
        <Route path="orders" element={<StationOrders />} />
        <Route path="inventory" element={<StationInventory />} />
        <Route path="pricing" element={<StationPricing />} />
        <Route path="riders" element={<StationRiders />} />
        <Route path="customers" element={<StationCustomers />} />
        <Route path="revenue" element={<StationRevenue />} />
      </Route>

      <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
