/**
 * ProtectedRoute.jsx
 * ─────────────────────────────────────────────────────────────
 * Route guard that enforces:
 *  1. Authentication  — unauthenticated users → /login
 *  2. Role access     — wrong-role users → /unauthorized
 *
 * Usage in App.jsx:
 *   <ProtectedRoute allowedRoles={['ADMIN']}>
 *     <Dashboard />
 *   </ProtectedRoute>
 *
 *   // OR — accessible by any authenticated user:
 *   <ProtectedRoute>
 *     <Settings />
 *   </ProtectedRoute>
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * @param {React.ReactNode}  children      - the page to render if allowed
 * @param {string[]}         allowedRoles  - roles that may access this route
 *                                          (empty = any authenticated user)
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // 1. Not logged in → send to login, remember where they were going
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role check (only if allowedRoles is non-empty)
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
