// ============================================================
// FILE: backend/src/middleware/auth.middleware.js
//
// CHANGE: authenticate() now also checks business_profiles.status.
//   If the business is 'suspended', all non-super_admin users
//   belonging to that business receive a 403 immediately.
//   super_admin users have NULL business_id and are never blocked.
// ============================================================

const { verifyToken } = require('../utils/jwt.utils');
const { sendError } = require('../utils/response.utils');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Single query: validate session, user active status, AND business status
    // LEFT JOIN business_profiles so super_admin (null business_id) still passes
    const sessionQuery = `
      SELECT
        s.user_id,
        u.is_active,
        u.role,
        u.business_id,
        bp.status AS business_status
      FROM user_sessions s
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN business_profiles bp ON bp.business_id = u.business_id
      WHERE s.token = $1
        AND s.expires_at > NOW()
    `;

    const { rows } = await pool.query(sessionQuery, [token]);

    if (rows.length === 0) {
      return sendError(res, 401, 'Invalid or expired session');
    }

    const row = rows[0];

    // Check 1: user's own account must be active
    if (!row.is_active) {
      return sendError(res, 401, 'User account is inactive');
    }

    // Check 2: if the user belongs to a business, that business must be active.
    // super_admin has null business_id → bp.status is NULL → skip this check.
    // Only enforce for roles that have a business_id (admin, manager, driver, etc.)
    if (row.business_id && row.business_status && row.business_status !== 'active') {
      return sendError(res, 403, 'Your business account has been suspended. Please contact the platform administrator.');
    }

    req.user = {
      userId:     decoded.userId,
      businessId: decoded.businessId,
      role:       decoded.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return sendError(res, 401, 'Authentication failed');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, 'Not authorized to access this resource');
    }

    next();
  };
};

module.exports = { authenticate, authorize };