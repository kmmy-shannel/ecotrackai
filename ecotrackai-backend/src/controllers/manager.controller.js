const pool = require('../config/database');
const { hashPassword } = require('../utils/password.utils');
const { sendSuccess, sendError } = require('../utils/response.utils');

// Get all managers for current business
const getManagers = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const query = `
      SELECT 
        user_id,
        username,
        email,
        full_name,
        role,
        is_active,
        created_at,
        last_login
      FROM users
      WHERE business_id = $1 
      AND role != 'admin'
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query, [req.user.businessId]);

    sendSuccess(res, 200, 'Managers retrieved successfully', {
      count: rows.length,
      managers: rows
    });

  } catch (error) {
    console.error('Get managers error:', error);
    sendError(res, 500, 'Failed to retrieve managers', error.message);
  }
};

// Create new manager account
const createManager = async (req, res) => {
  try {
    
    console.log('CREATING MANAGER ACCOUNT');
    console.log('Request by admin:', req.user.userId);
    console.log('Request data:', req.body);
    

    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    // Only admin can create managers
    if (req.user.role !== 'admin') {
      console.log('Non-admin user attempted to create manager');
      return sendError(res, 403, 'Only administrators can create manager accounts');
    }

    const {
      username,
      email,
      password,
      fullName,
      role
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullName || !role) {
      console.log('Missing required fields');
      return sendError(res, 400, 'Please provide all required fields');
    }

    // Validate role
    const validRoles = ['inventory_manager', 'logistics_manager', 'sustainability_manager', 'finance_manager'];
    if (!validRoles.includes(role)) {
      console.log('Invalid role:', role);
      return sendError(res, 400, 'Invalid role. Must be one of: inventory_manager, logistics_manager, sustainability_manager, finance_manager');
    }

    // Check if user already exists
    console.log('Checking for existing user...');
    const userCheck = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (userCheck.rows.length > 0) {
      console.log('User already exists');
      return sendError(res, 400, 'User with this email or username already exists');
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await hashPassword(password);

    // Create manager account
    console.log('Creating manager account...');
    const userQuery = `
      INSERT INTO users 
      (business_id, username, email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING user_id, username, email, full_name, role, is_active, created_at
    `;

    const result = await pool.query(userQuery, [
      req.user.businessId,
      username,
      email,
      hashedPassword,
      fullName,
      role
    ]);

    const newManager = result.rows[0];
    console.log('Manager created successfully with ID:', newManager.user_id);

   
    console.log('MANAGER CREATION COMPLETED');
 
    sendSuccess(res, 201, 'Manager account created successfully', {
      manager: {
        userId: newManager.user_id,
        username: newManager.username,
        email: newManager.email,
        fullName: newManager.full_name,
        role: newManager.role,
        isActive: newManager.is_active,
        createdAt: newManager.created_at
      }
    });

  } catch (error) {
    console.error('CREATE MANAGER ERROR');
    console.error('Error:', error);
    sendError(res, 500, 'Failed to create manager account', error.message);
  }
};

// Update manager account
const updateManager = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return sendError(res, 403, 'Only administrators can update manager accounts');
    }

    const { managerId } = req.params;
    const { fullName, email, username, isActive } = req.body;

    // Check if manager belongs to same business
    const checkQuery = `
      SELECT user_id FROM users 
      WHERE user_id = $1 AND business_id = $2 AND role != 'admin'
    `;
    const checkResult = await pool.query(checkQuery, [managerId, req.user.businessId]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Manager not found or cannot be modified');
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (email) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (username) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (typeof isActive === 'boolean') {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return sendError(res, 400, 'No fields to update');
    }

    values.push(managerId);
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramCount}
      RETURNING user_id, username, email, full_name, role, is_active
    `;

    const result = await pool.query(updateQuery, values);

    sendSuccess(res, 200, 'Manager updated successfully', {
      manager: result.rows[0]
    });

  } catch (error) {
    console.error('Update manager error:', error);
    sendError(res, 500, 'Failed to update manager', error.message);
  }
};

// Delete/deactivate manager account
const deleteManager = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return sendError(res, 403, 'Only administrators can delete manager accounts');
    }

    const { managerId } = req.params;

    // Check if manager belongs to same business
    const checkQuery = `
      SELECT user_id, role FROM users 
      WHERE user_id = $1 AND business_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [managerId, req.user.businessId]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Manager not found');
    }

    if (checkResult.rows[0].role === 'admin') {
      return sendError(res, 403, 'Cannot delete admin account');
    }

    // Soft delete - just deactivate the account
    await pool.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE user_id = $1',
      [managerId]
    );

    // Also delete any active sessions
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [managerId]
    );

    sendSuccess(res, 200, 'Manager account deactivated successfully');

  } catch (error) {
    console.error('Delete manager error:', error);
    sendError(res, 500, 'Failed to delete manager', error.message);
  }
};

// Reset manager password
const resetManagerPassword = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return sendError(res, 403, 'Only administrators can reset passwords');
    }

    const { managerId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters');
    }

    // Check if manager belongs to same business
    const checkQuery = `
      SELECT user_id, role FROM users 
      WHERE user_id = $1 AND business_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [managerId, req.user.businessId]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Manager not found');
    }

    if (checkResult.rows[0].role === 'admin') {
      return sendError(res, 403, 'Cannot reset admin password');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [hashedPassword, managerId]
    );

    // Delete all sessions to force re-login
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [managerId]
    );

    sendSuccess(res, 200, 'Password reset successfully');

  } catch (error) {
    console.error('Reset password error:', error);
    sendError(res, 500, 'Failed to reset password', error.message);
  }
};

module.exports = {
  getManagers,
  createManager,
  updateManager,
  deleteManager,
  resetManagerPassword
};