import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isRoleAllowed } from '../../utils/rolePermissions';

/**
 * RoleGuard Component - Protects UI elements based on user role
 * Only renders children if user has the required role
 */
export const RoleGuard = ({ requiredRole, children, fallback = null }) => {
  const { role } = useAuth();

  if (!isRoleAllowed(role, requiredRole)) {
    return fallback;
  }

  return <>{children}</>;
};

export default RoleGuard;
