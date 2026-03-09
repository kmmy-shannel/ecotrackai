import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardRoute, isRoleAllowed } from '../../utils/rolePermissions';

/**
 * ProtectedRoute Component - Guards routes based on authentication and role
 * Redirects to login if not authenticated
 * Redirects to unauthorized if role doesn't match
 */
export const ProtectedRoute = ({ requiredRole, element, children, redirectTo = '/' }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole && !isRoleAllowed(role, requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (element) return element;
  if (children) return <>{children}</>;
  return <Navigate to={getDashboardRoute(role)} replace />;
};

export default ProtectedRoute;
