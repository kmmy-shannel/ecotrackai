// ============================================================
// FILE LOCATION: backend/src/models/manager.model.js
// LAYER: Model — DB queries ONLY, no business logic
// ============================================================

const pool = require('../config/database');

const ManagerModel = {

  // Get all non-admin users for a business
  async findAllByBusiness(businessId) {
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
    const { rows } = await pool.query(query, [businessId]);
    return rows;
  },

  // Check if email or username already exists
  async findByEmailOrUsername(email, username) {
    const query = `
      SELECT user_id FROM users 
      WHERE email = $1 OR username = $2
    `;
    const { rows } = await pool.query(query, [email, username]);
    return rows[0] || null;
  },

  // Insert a new manager user
  async create(businessId, username, email, hashedPassword, fullName, role) {
    const query = `
      INSERT INTO users 
        (business_id, username, email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING user_id, username, email, full_name, role, is_active, created_at
    `;
    const { rows } = await pool.query(query, [
      businessId,
      username,
      email,
      hashedPassword,
      fullName,
      role
    ]);
    return rows[0];
  },

  // Verify manager belongs to business and is not admin (for update/delete/reset)
  async findByIdAndBusiness(managerId, businessId) {
    const query = `
      SELECT user_id, role FROM users 
      WHERE user_id = $1 AND business_id = $2
    `;
    const { rows } = await pool.query(query, [managerId, businessId]);
    return rows[0] || null;
  },

  // Verify manager belongs to business AND is not admin (for update only)
  async findNonAdminByIdAndBusiness(managerId, businessId) {
    const query = `
      SELECT user_id FROM users 
      WHERE user_id = $1 AND business_id = $2 AND role != 'admin'
    `;
    const { rows } = await pool.query(query, [managerId, businessId]);
    return rows[0] || null;
  },

  // Dynamic update of manager fields
  async update(managerId, fields) {
    const updates = [];
    const values  = [];
    let paramCount = 1;

    if (fields.fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fields.fullName);
    }
    if (fields.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(fields.email);
    }
    if (fields.username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(fields.username);
    }
    if (typeof fields.isActive === 'boolean') {
      updates.push(`is_active = $${paramCount++}`);
      values.push(fields.isActive);
    }

    if (updates.length === 0) return null;

    values.push(managerId);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramCount}
      RETURNING user_id, username, email, full_name, role, is_active
    `;
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  // Soft delete — deactivate account
  async deactivate(managerId) {
    await pool.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE user_id = $1',
      [managerId]
    );
  },

  // Delete all active sessions for a user
  async deleteSessions(managerId) {
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [managerId]
    );
  },

  // Update password hash
  async updatePassword(managerId, hashedPassword) {
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [hashedPassword, managerId]
    );
  }

};

module.exports = ManagerModel;