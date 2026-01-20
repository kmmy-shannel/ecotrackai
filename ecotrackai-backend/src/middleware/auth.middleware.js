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

    const sessionQuery = `
      SELECT s.*, u.is_active 
      FROM user_sessions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `;
    
    const { rows } = await pool.query(sessionQuery, [token]);

    if (rows.length === 0) {
      return sendError(res, 401, 'Invalid or expired session');
    }

    if (!rows[0].is_active) {
      return sendError(res, 401, 'User account is inactive');
    }

    req.user = {
      userId: decoded.userId,
      businessId: decoded.businessId,
      role: decoded.role
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

module.exports = {
  authenticate,
  authorize
};