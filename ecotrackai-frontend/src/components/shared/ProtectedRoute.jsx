// ============================================================
// FILE: src/components/shared/ProtectedRoute.jsx
// ============================================================
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Wraps a route element with role-based access control.
 *
 * Props:
 *   element      — the JSX element to render if authorized
 *   requiredRole — string or string[] of allowed roles
 *
 * Behaviour:
 *   • Still loading  → render nothing (avoids flash-redirect)
 *   • Not authed     → redirect to /login
 *   • Wrong role     → redirect to /unauthorized
 *   • Authorized     → render element
 */
const ProtectedRoute = ({ element, requiredRole }) => {
  const { isAuthenticated, role, loading } = useAuth();

  // Wait for auth state to resolve before making any redirect decision
  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return element;
};

export default ProtectedRoute;
