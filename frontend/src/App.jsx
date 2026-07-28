/**
 * App.jsx
 * Root component. Wraps the entire app in AuthProvider and
 * defines all routes with role-based protection.
 *
 * Route protection summary:
 *   /dashboard            → ADMIN only
 *   /shipments            → ADMIN, DISPATCHER
 *   /vehicles             → ADMIN, DISPATCHER
 *   /customers            → ADMIN only
 *   /reports              → ADMIN only
 *   /settings             → any authenticated user
 *   /dispatcher/*         → DISPATCHER only
 *   /driver/*             → DRIVER only
 *   /customer/*           → CUSTOMER only
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Auth ──────────────────────────────────────────────────────
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute   from './auth/ProtectedRoute';
import { ROLES }        from './auth/roleConfig';
import { ToastProvider } from './components/ToastContext';

// ── Public pages ──────────────────────────────────────────────
import Login           from './pages/Login';
import Register        from './pages/Register';
import Unauthorized    from './pages/Unauthorized';
import ForgotPassword  from './pages/ForgotPassword';
import VerifyOTP       from './pages/VerifyOTP';
import ResetPassword   from './pages/ResetPassword';

// ── Admin pages ───────────────────────────────────────────────
import Dashboard  from './pages/Dashboard';
import Shipments  from './pages/Shipments';
import Vehicles   from './pages/Vehicles';
import Customers  from './pages/Customers';
import Reports    from './pages/Reports';
import Settings   from './pages/Settings';

// ── Dispatcher pages ──────────────────────────────────────────
import DispatcherDashboard from './pages/dispatcher/DispatcherDashboard';
import DispatcherOrders    from './pages/dispatcher/DispatcherOrders';

// ── Driver pages ──────────────────────────────────────────────
import DriverDashboard  from './pages/driver/DriverDashboard';
import DriverDeliveries from './pages/driver/DriverDeliveries';
import DriverRoute      from './pages/driver/DriverRoute';
import DriverHistory    from './pages/driver/DriverHistory';

// ── Customer pages ────────────────────────────────────────────
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerShipments from './pages/customer/CustomerShipments';
import CustomerTrack     from './pages/customer/CustomerTrack';
import CustomerProfile   from './pages/customer/CustomerProfile';

// ── Business Client pages ─────────────────────────────────────
import BusinessClientDashboard from './pages/businessClient/BusinessClientDashboard';
import BusinessClientProfile   from './pages/businessClient/BusinessClientProfile';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        {/* AuthProvider makes useAuth() available everywhere */}
        <AuthProvider>
          <Routes>

            {/* ── Public ── */}
            <Route path="/login"           element={<Login />}          />
            <Route path="/register"        element={<Register />}       />
            <Route path="/unauthorized"    element={<Unauthorized />}   />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp"      element={<VerifyOTP />}      />
            <Route path="/reset-password"  element={<ResetPassword />}  />

            {/* ── Admin routes ── */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/shipments" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DISPATCHER]}>
                <Shipments />
              </ProtectedRoute>
            } />

            <Route path="/vehicles" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DISPATCHER]}>
                <Vehicles />
              </ProtectedRoute>
            } />

            <Route path="/customers" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <Customers />
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <Reports />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DISPATCHER, ROLES.DRIVER, ROLES.CUSTOMER]}>
                <Settings />
              </ProtectedRoute>
            } />

            {/* ── Dispatcher routes ── */}
            <Route path="/dispatcher/dashboard" element={
              <ProtectedRoute allowedRoles={[ROLES.DISPATCHER]}>
                <DispatcherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dispatcher/orders" element={
              <ProtectedRoute allowedRoles={[ROLES.DISPATCHER]}>
                <DispatcherOrders />
              </ProtectedRoute>
            } />

            {/* Dispatcher reuses shared pages for /shipments and /vehicles
                (already registered above with DISPATCHER in allowedRoles) */}

            {/* ── Driver routes ── */}
            <Route path="/driver/dashboard" element={
              <ProtectedRoute allowedRoles={[ROLES.DRIVER]}>
                <DriverDashboard />
              </ProtectedRoute>
            } />
            <Route path="/driver/deliveries" element={
              <ProtectedRoute allowedRoles={[ROLES.DRIVER]}>
                <DriverDeliveries />
              </ProtectedRoute>
            } />
            <Route path="/driver/route" element={
              <ProtectedRoute allowedRoles={[ROLES.DRIVER]}>
                <DriverRoute />
              </ProtectedRoute>
            } />
            <Route path="/driver/history" element={
              <ProtectedRoute allowedRoles={[ROLES.DRIVER]}>
                <DriverHistory />
              </ProtectedRoute>
            } />

            {/* ── Customer routes ── */}
            <Route path="/customer/dashboard" element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/customer/shipments" element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerShipments />
              </ProtectedRoute>
            } />
            <Route path="/customer/track" element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerTrack />
              </ProtectedRoute>
            } />
            <Route path="/customer/profile" element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerProfile />
              </ProtectedRoute>
            } />

            {/* ── Business Client routes ── */}
            <Route path="/business/dashboard" element={
              <ProtectedRoute allowedRoles={[ROLES.BUSINESS_CLIENT]}>
                <BusinessClientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/business/shipments" element={
              <ProtectedRoute allowedRoles={[ROLES.BUSINESS_CLIENT]}>
                <Shipments />
              </ProtectedRoute>
            } />
            <Route path="/business/customers" element={
              <ProtectedRoute allowedRoles={[ROLES.BUSINESS_CLIENT]}>
                <Customers />
              </ProtectedRoute>
            } />
            <Route path="/business/reports" element={
              <ProtectedRoute allowedRoles={[ROLES.BUSINESS_CLIENT]}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/business/profile" element={
              <ProtectedRoute allowedRoles={[ROLES.BUSINESS_CLIENT]}>
                <BusinessClientProfile />
              </ProtectedRoute>
            } />

            {/* ── Default redirect ── */}
            <Route path="*" element={<Navigate to="/login" replace />} />

          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;