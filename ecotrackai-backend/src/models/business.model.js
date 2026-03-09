// ============================================================
// FILE: backends/src/models/business.model.js
// LAYER: Model — DB queries ONLY, no business logic
// PURPOSE: Centralized business profile CRUD for Super Admin
// ============================================================

const pool = require('../config/database');

const BusinessModel = {
  
  _isNil(value) {
    return value === null || value === undefined;
  },

  _handleDbError(method, error) {
    console.error(`[BusinessModel.${method}]`, error);
    if (error.code === '23505') {
      return 'Business with this registration_number already exists';
    }
    if (error.code === '23503') {
      return 'Foreign key constraint violation';
    }
    return 'Database operation failed';
  },

  // ===== CREATE =====
  async create(data) {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Data is required' };
    }

    const { businessName, businessType, registrationNumber, address, contactEmail, contactPhone } = data;

    if (!businessName || !businessType || !registrationNumber) {
      return { success: false, error: 'business_name, business_type, and registration_number are required' };
    }

    try {
      const query = `
        INSERT INTO business_profiles (
          business_name, business_type, registration_number, address, contact_email, contact_phone, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `;
      const { rows } = await pool.query(query, [
        businessName, businessType, registrationNumber, address || null, contactEmail || null, contactPhone || null
      ]);
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('create', error) };
    }
  },

  // ===== READ =====
  async findById(businessId) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'business_id is required' };
    }

    try {
      const query = `
        SELECT 
          b.*,
          COUNT(u.user_id) as total_users,
          COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count
        FROM business_profiles b
        LEFT JOIN users u ON b.business_id = u.business_id AND u.is_active = true
        WHERE b.business_id = $1
        GROUP BY b.business_id
      `;
      const { rows } = await pool.query(query, [businessId]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findById', error) };
    }
  },

  async findAll(limit = 100, offset = 0) {
    try {
      const query = `
        SELECT 
          b.*,
          COUNT(u.user_id) as total_users,
          COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count
        FROM business_profiles b
        LEFT JOIN users u ON b.business_id = u.business_id AND u.is_active = true
        GROUP BY b.business_id
        ORDER BY b.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const { rows } = await pool.query(query, [limit, offset]);
      
      const countQuery = 'SELECT COUNT(*) as total FROM business_profiles';
      const countResult = await pool.query(countQuery);
      const total = parseInt(countResult.rows[0].total);

      return { success: true, data: { businesses: rows, total, limit, offset } };
    } catch (error) {
      return { success: false, error: this._handleDbError('findAll', error) };
    }
  },

  async findByStatus(status, limit = 100, offset = 0) {
    if (!['active', 'suspended'].includes(status)) {
      return { success: false, error: 'Invalid status. Must be active or suspended' };
    }

    try {
      const query = `
        SELECT 
          b.*,
          COUNT(u.user_id) as total_users,
          COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count
        FROM business_profiles b
        LEFT JOIN users u ON b.business_id = u.business_id AND u.is_active = true
        WHERE b.status = $1
        GROUP BY b.business_id
        ORDER BY b.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const { rows } = await pool.query(query, [status, limit, offset]);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByStatus', error) };
    }
  },

  async findByRegistrationNumber(registrationNumber) {
    if (this._isNil(registrationNumber)) {
      return { success: false, error: 'registration_number is required' };
    }

    try {
      const query = 'SELECT * FROM business_profiles WHERE registration_number = $1';
      const { rows } = await pool.query(query, [registrationNumber]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByRegistrationNumber', error) };
    }
  },

  // ===== UPDATE =====
  async updateStatus(businessId, isActive) {
    if (this._isNil(businessId) || this._isNil(isActive)) {
      return { success: false, error: 'business_id and status flag are required' };
    }

    try {
      const status = isActive ? 'active' : 'suspended';
      const query = `
        UPDATE business_profiles
        SET status = $1, updated_at = NOW()
        WHERE business_id = $2
        RETURNING *
      `;
      const { rows } = await pool.query(query, [status, businessId]);
      if (rows.length === 0) {
        return { success: false, error: 'Business not found' };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('updateStatus', error) };
    }
  },

  async updateProfile(businessId, data) {
    if (this._isNil(businessId) || !data || typeof data !== 'object') {
      return { success: false, error: 'business_id and data are required' };
    }

    const { businessName, businessType, address, contactEmail, contactPhone } = data;
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (!this._isNil(businessName)) {
      fields.push(`business_name = $${paramIndex++}`);
      values.push(businessName);
    }
    if (!this._isNil(businessType)) {
      fields.push(`business_type = $${paramIndex++}`);
      values.push(businessType);
    }
    if (!this._isNil(address)) {
      fields.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (!this._isNil(contactEmail)) {
      fields.push(`contact_email = $${paramIndex++}`);
      values.push(contactEmail);
    }
    if (!this._isNil(contactPhone)) {
      fields.push(`contact_phone = $${paramIndex++}`);
      values.push(contactPhone);
    }

    if (fields.length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    fields.push(`updated_at = NOW()`);
    values.push(businessId);

    try {
      const query = `
        UPDATE business_profiles
        SET ${fields.join(', ')}
        WHERE business_id = $${paramIndex}
        RETURNING *
      `;
      const { rows } = await pool.query(query, values);
      if (rows.length === 0) {
        return { success: false, error: 'Business not found' };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('updateProfile', error) };
    }
  },

  // ===== DELETE (Hard Delete - Only if no users associated) =====
  async deleteIfNoUsers(businessId) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'business_id is required' };
    }

    try {
      const checkQuery = `
        SELECT COUNT(*) as user_count
        FROM users
        WHERE business_id = $1
      `;
      const checkResult = await pool.query(checkQuery, [businessId]);
      const userCount = parseInt(checkResult.rows[0].user_count);

      if (userCount > 0) {
        return { success: false, error: `Cannot delete business with ${userCount} active users` };
      }

      const deleteQuery = 'DELETE FROM business_profiles WHERE business_id = $1 RETURNING *';
      const { rows } = await pool.query(deleteQuery, [businessId]);
      
      if (rows.length === 0) {
        return { success: false, error: 'Business not found' };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('deleteIfNoUsers', error) };
    }
  },

  // ===== STATISTICS =====
  async getSystemStats() {
    try {
      const query = `
        SELECT
          COUNT(DISTINCT b.business_id) as total_businesses,
          COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.business_id END) as active_businesses,
          COUNT(DISTINCT CASE WHEN b.status = 'suspended' THEN b.business_id END) as suspended_businesses,
          COUNT(DISTINCT u.user_id) as total_users,
          COUNT(DISTINCT CASE WHEN u.role = 'super_admin' THEN u.user_id END) as super_admin_count,
          COUNT(DISTINCT CASE WHEN u.role = 'admin' THEN u.user_id END) as admin_count
        FROM business_profiles b
        LEFT JOIN users u ON b.business_id = u.business_id
      `;
      const { rows } = await pool.query(query);
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('getSystemStats', error) };
    }
  }
};

module.exports = BusinessModel;
