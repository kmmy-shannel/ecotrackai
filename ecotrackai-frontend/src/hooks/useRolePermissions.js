import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { hasPermission, canAccessBusiness } from '../utils/rolePermissions';

/**
 * useRolePermissions hook - Check user permissions
 * @returns {object} Methods to check permissions
 */
export const useRolePermissions = () => {
  const { role, businessId } = useAuth();

  const checkPermission = useCallback(
    (permission) => {
      return hasPermission(role, permission);
    },
    [role]
  );

  const checkBusinessAccess = useCallback(
    (resourceBusinessId) => {
      return canAccessBusiness(role, businessId, resourceBusinessId);
    },
    [role, businessId]
  );

  const canApprove = useCallback(
    (approvalType) => {
      const approvalPermissions = {
        spoilage_action: ['inventory_manager'],
        route_optimization: ['logistics_manager'],
        carbon_verification: ['sustainability_manager'],
      };

      return approvalPermissions[approvalType]?.includes(role) || false;
    },
    [role]
  );

  const canSubmitFor = useCallback(
    (submissionType) => {
      const submissionPermissions = {
        spoilage_action: ['admin'],
        route_optimization: ['admin'],
      };

      return submissionPermissions[submissionType]?.includes(role) || false;
    },
    [role]
  );

  return {
    checkPermission,
    checkBusinessAccess,
    canApprove,
    canSubmitFor,
  };
};

export default useRolePermissions;
