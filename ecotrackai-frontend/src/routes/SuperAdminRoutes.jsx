// ============================================================
// FILE: src/routes/SuperAdminRoutes.jsx
// LAYER: Route Configuration — Role-Based Protection
// PURPOSE: Protect Super Admin dashboard from unauthorized access
// SECURITY: Only users with role === 'super_admin' can access
// ============================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import SuperAdminDashboard from '../pages/SuperAdminDashboard';

/**
 * ProtectedSuperAdminRoute
 * ============================================================
 * Middleware component that verifies role before rendering dashboard
 * 
 * Rules:
 * 1. Requires JWT token with role field
 * 2. Requires role === 'super_admin'
 * 3. Redirects unauthorized users to /unauthorized
 * 4. Does NOT bypass backend RBAC (backend validates all requests)
 * 
 * @returns {JSX.Element} Dashboard or Unauthorized redirect
 */
const ProtectedSuperAdminRoute = () => {
  // Get token from localStorage
  const token = localStorage.getItem('token');

  // Parse JWT to get user data (payload)
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    // Decode JWT payload (base64 decode)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userRole = payload.role || null;

    // Check if user is super_admin
    if (userRole !== 'super_admin') {
      console.warn(`[SuperAdminRoutes] Access denied. User role: ${userRole}, required: super_admin`);
      return <Navigate to="/unauthorized" replace />;
    }

    // User is super_admin — render dashboard
    return <SuperAdminDashboard />;
  } catch (error) {
    console.error('[SuperAdminRoutes] Token decode error:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedSuperAdminRoute;
