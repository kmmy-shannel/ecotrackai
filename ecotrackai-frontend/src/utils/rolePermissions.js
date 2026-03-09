export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  INVENTORY_MANAGER: 'inventory_manager',
  LOGISTICS_MANAGER: 'logistics_manager',
  SUSTAINABILITY_MANAGER: 'sustainability_manager',
  DRIVER: 'driver',
};

export const rolePermissions = {
  super_admin: {
    label: 'Super Admin',
    description: 'System-wide platform administrator',
    canAccess: [
      'business_registry',
      'system_health',
      'product_catalog',
      'ecotrust_config',
      'audit_log',
      'analytics',
    ],
    canApprove: ['global_policies'],
    canView: ['all_businesses'],
  },
  admin: {
    label: 'Admin',
    description: 'Business owner submit-only role',
    canAccess: ['inventory', 'delivery', 'alerts', 'ecotrust', 'managers', 'carbon'],
    canApprove: [],
    canSubmitFor: ['spoilage_action', 'route_optimization', 'carbon_verification'],
    canView: ['own_business_only'],
  },
  inventory_manager: {
    label: 'Inventory Manager',
    description: 'Spoilage approvals owner',
    canAccess: ['pending_spoilage_approvals', 'approval_history', 'high_risk_alerts'],
    canApprove: ['spoilage_action'],
    canView: ['own_business_only'],
  },
  logistics_manager: {
    label: 'Logistics Manager',
    description: 'Route approvals and driver monitor owner',
    canAccess: ['pending_route_approvals', 'driver_monitor', 'approval_history', 'live_map'],
    canApprove: ['route_optimization'],
    canView: ['own_business_only'],
  },
  sustainability_manager: {
    label: 'Sustainability Manager',
    description: 'Carbon and EcoTrust verification owner',
    canAccess: ['pending_carbon_verifications', 'ecotrust_audit', 'carbon_trends'],
    canApprove: ['carbon_verification'],
    canView: ['own_business_only'],
  },
  driver: {
    label: 'Driver',
    description: 'Delivery execution role',
    canAccess: ['today_route', 'delivery_history', 'profile'],
    canApprove: [],
    canView: ['assigned_routes_only'],
  },
};

export const hasPermission = (role, permission) => {
  const perms = rolePermissions[role];
  if (!perms) return false;
  return (
    perms.canAccess?.includes(permission) ||
    perms.canApprove?.includes(permission) ||
    perms.canView?.includes(permission) ||
    perms.canSubmitFor?.includes(permission)
  );
};

export const canAccessBusiness = (userRole, userBusinessId, resourceBusinessId) => {
  if (userRole === ROLES.SUPER_ADMIN) return true;
  return userBusinessId === resourceBusinessId;
};

export const getDashboardRoute = (role) => {
  const routes = {
    [ROLES.SUPER_ADMIN]: '/dashboard/super-admin',
    [ROLES.ADMIN]: '/dashboard/admin',
    [ROLES.INVENTORY_MANAGER]: '/dashboard/inventory-manager',
    [ROLES.LOGISTICS_MANAGER]: '/dashboard/logistics-manager',
    [ROLES.SUSTAINABILITY_MANAGER]: '/dashboard/sustainability-manager',
    [ROLES.DRIVER]: '/dashboard/driver',
  };
  return routes[role] || '/login';
};

export const getRoleNavItems = (role) => {
  const menuItems = {
    [ROLES.SUPER_ADMIN]: [
      { label: 'Business Registry', path: '/dashboard/super-admin?tab=registry', icon: 'building' },
      { label: 'System Health', path: '/dashboard/super-admin?tab=system-health', icon: 'pulse' },
      { label: 'Catalog', path: '/dashboard/super-admin?tab=catalog', icon: 'list' },
      { label: 'EcoTrust Config', path: '/dashboard/super-admin?tab=ecotrust', icon: 'settings' },
      { label: 'Audit Log', path: '/dashboard/super-admin?tab=audit', icon: 'history' },
      { label: 'Analytics', path: '/dashboard/super-admin?tab=analytics', icon: 'chart' },
    ],
    [ROLES.ADMIN]: [
      { label: 'Dashboard', path: '/dashboard/admin', icon: 'layout' },
      { label: 'Inventory', path: '/products', icon: 'box' },
      { label: 'Delivery', path: '/deliveries', icon: 'truck' },
      { label: 'Alerts', path: '/alerts', icon: 'bell' },
      { label: 'EcoTrust', path: '/ecoscore', icon: 'leaf' },
      { label: 'Managers', path: '/managers', icon: 'users' },
    ],
    [ROLES.INVENTORY_MANAGER]: [
      { label: 'Pending Approvals', path: '/dashboard/inventory-manager?tab=pending', icon: 'check' },
      { label: 'History', path: '/dashboard/inventory-manager?tab=history', icon: 'history' },
      { label: 'Alerts', path: '/dashboard/inventory-manager?tab=alerts', icon: 'bell' },
    ],
    [ROLES.LOGISTICS_MANAGER]: [
      { label: 'Pending Approvals', path: '/dashboard/logistics-manager?tab=pending', icon: 'check' },
      { label: 'Driver Monitor', path: '/dashboard/logistics-manager?tab=drivers', icon: 'map' },
      { label: 'History', path: '/dashboard/logistics-manager?tab=history', icon: 'history' },
      { label: 'Map', path: '/dashboard/logistics-manager?tab=map', icon: 'navigation' },
    ],
[ROLES.SUSTAINABILITY_MANAGER]: [
  { label: 'Pending Verifications', path: '/dashboard/sustainability-manager?tab=pending',  icon: 'check' },
  { label: 'Verification History',  path: '/dashboard/sustainability-manager?tab=history',  icon: 'history' },
  { label: 'EcoTrust Audit',        path: '/dashboard/sustainability-manager?tab=audit',    icon: 'flag' },
  { label: 'Carbon Trends',         path: '/dashboard/sustainability-manager?tab=trends',   icon: 'chart' },
],
    [ROLES.DRIVER]: [
      { label: "Today's Route", path: '/dashboard/driver?tab=today', icon: 'navigation' },
      { label: 'History', path: '/dashboard/driver?tab=history', icon: 'history' },
      { label: 'Profile', path: '/dashboard/driver?tab=profile', icon: 'user' },
    ],
  };
  return menuItems[role] || [];
};

export const canApproveType = (role, approvalType) => {
  if (!role || !approvalType) return false;
  return rolePermissions[role]?.canApprove?.includes(approvalType) || false;
};

export const isRoleAllowed = (role, requiredRole) => {
  if (!requiredRole) return true;
  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return allowed.includes(role);
};

export const canPerformBulkActions = (role) => {
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LOGISTICS_MANAGER].includes(role);
};

export const canExportData = (role) => {
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LOGISTICS_MANAGER, ROLES.SUSTAINABILITY_MANAGER].includes(role);
};
