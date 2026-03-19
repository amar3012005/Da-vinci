import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './auth/LoginPage';
import AppShell from './layout/AppShell';

// Pages (lazy loaded for code splitting)
const Overview = React.lazy(() => import('./pages/Overview'));
const Memories = React.lazy(() => import('./pages/Memories'));
const ApiKeys = React.lazy(() => import('./pages/ApiKeys'));
const Connectors = React.lazy(() => import('./pages/Connectors'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Evaluation = React.lazy(() => import('./pages/Evaluation'));
const Settings = React.lazy(() => import('./pages/Settings'));

function PageSuspense({ children }) {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#bdf213] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {children}
    </React.Suspense>
  );
}

/**
 * HIVEMIND Dashboard Application
 * Mounts under /hivemind/app/* and /hivemind/login
 */
export default function HiveMindApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />

        {/* Protected dashboard */}
        <Route
          path="app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<PageSuspense><Overview /></PageSuspense>} />
          <Route path="memories" element={<PageSuspense><Memories /></PageSuspense>} />
          <Route path="keys" element={<PageSuspense><ApiKeys /></PageSuspense>} />
          <Route path="connectors" element={<PageSuspense><Connectors /></PageSuspense>} />
          <Route path="profile" element={<PageSuspense><Profile /></PageSuspense>} />
          <Route path="evaluation" element={<PageSuspense><Evaluation /></PageSuspense>} />
          <Route path="settings" element={<PageSuspense><Settings /></PageSuspense>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="app/overview" replace />} />
      </Routes>
    </AuthProvider>
  );
}
