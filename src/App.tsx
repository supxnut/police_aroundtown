import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

// Police Pages
import { PoliceDashboard } from './pages/police/PoliceDashboard';
import { PoliceActivitiesPage } from './pages/police/PoliceActivitiesPage';
import { PoliceShopPage } from './pages/police/PoliceShopPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminDutyPage } from './pages/admin/AdminDutyPage';
import { AdminCasesPage } from './pages/admin/AdminCasesPage';
import { AdminActivitiesPage } from './pages/admin/AdminActivitiesPage';
import { AdminShopPage } from './pages/admin/AdminShopPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminCaseAlertsPage } from './pages/admin/AdminCaseAlertsPage';

// Protected Route Wrapper for Authenticated Users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, checkAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    checkAuth(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Authenticating police credentials...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Guard Wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading, checkAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    checkAuth(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Verifying security clearance...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Police MDT Portal Routes */}
            <Route
              path="/police"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<PoliceDashboard />} />
              <Route path="activities" element={<PoliceActivitiesPage />} />
              <Route path="shop" element={<PoliceShopPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Admin Management Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <MainLayout />
                </AdminRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="duty" element={<AdminDutyPage />} />
              <Route path="cases" element={<AdminCasesPage />} />
              <Route path="activities" element={<AdminActivitiesPage />} />
              <Route path="shop" element={<AdminShopPage />} />
              <Route path="logs" element={<AdminLogsPage />} />
              <Route path="case-alerts" element={<AdminCaseAlertsPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Fallback Catch-all Route */}
            <Route path="*" element={<Navigate to="/police/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
