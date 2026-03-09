// ============================================================
// FILE: backend/src/models/registration.model.js
// LAYER: Model — DB queries ONLY, transaction support
// PURPOSE: Business registration with atomic operations
// ============================================================

const pool = require('../config/database');

const RegistrationModel = {

  _isNil(value) {
    return value === null || value === undefined;
  },

  _handleDbError(method, error) {
    console.error(`[RegistrationModel.${method}]`, error);
    if (error.code === '23505') {
      const constraint = error.constraint || '';
      if (constraint.includes('business_name')) return 'Business name already exists';
      if (constraint.includes('registration_number')) return 'Registration number already exists';
      if (constraint.includes('contact_email')) return 'Contact email already exists';
      if (constraint.includes('email')) return 'Email already exists';
      return 'Duplicate value error';
    }
    if (error.code === '23503') return 'Foreign key constraint violation';
    if (error.code === '40P01') return 'Deadlock detected; retry transaction';
    return 'Database operation failed';
  },

  /**
   * ===== TRANSACTION SUPPORT =====
   */
  async withTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      const result = await callback(client);
      await client.query('COMMIT');
      return { success: true, data: result };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[RegistrationModel.withTransaction] Rollback:', error.message);
      return { success: false, error: this._handleDbError('withTransaction', error) };
    } finally {
      client.release();
    }
  },

  /**
   * ===== UNIQUENESS CHECKS =====
   */
  async checkBusinessNameExists(businessName) {
    if (this._isNil(businessName)) {
      return { success: false, error: 'business_name is required' };
    }
    try {
      const query = 'SELECT business_id FROM business_profiles WHERE LOWER(business_name) = LOWER($1)';
      const { rows } = await pool.query(query, [businessName]);
      return { success: true, data: rows.length > 0 };
    } catch (error) {
      return { success: false, error: this._handleDbError('checkBusinessNameExists', error) };
    }
  },

  async checkRegistrationNumberExists(registrationNumber) {
    if (this._isNil(registrationNumber)) {
      return { success: false, error: 'registration_number is required' };
    }
    try {
      const query = 'SELECT business_id FROM business_profiles WHERE registration_number = $1';
      const { rows } = await pool.query(query, [registrationNumber]);
      return { success: true, data: rows.length > 0 };
    } catch (error) {
      return { success: false, error: this._handleDbError('checkRegistrationNumberExists', error) };
    }
  },

  async checkContactEmailExists(contactEmail) {
    if (this._isNil(contactEmail)) {
      return { success: false, error: 'contact_email is required' };
    }
    try {
      const query = 'SELECT business_id FROM business_profiles WHERE contact_email = $1';
      const { rows } = await pool.query(query, [contactEmail]);
      return { success: true, data: rows.length > 0 };
    } catch (error) {
      return { success: false, error: this._handleDbError('checkContactEmailExists', error) };
    }
  },

  async checkAdminEmailExists(email) {
    if (this._isNil(email)) {
      return { success: false, error: 'email is required' };
    }
    try {
      const query = 'SELECT user_id FROM users WHERE email = $1';
      const { rows } = await pool.query(query, [email]);
      return { success: true, data: rows.length > 0 };
    } catch (error) {
      return { success: false, error: this._handleDbError('checkAdminEmailExists', error) };
    }
  },

  /**
   * ===== TRANSACTION OPERATIONS (Flow A + Flow B) =====
   */
  async createBusinessWithAdmin(client, flowData) {
    if (!client || !flowData || typeof flowData !== 'object') {
      return { success: false, error: 'client and flowData are required' };
    }

    const {
      businessName,
      businessType,
      registrationNumber,
      address,
      contactEmail,
      contactPhone,
      adminUsername,
      adminName,
      adminEmail,
      adminPasswordHash,
      status = 'active',
      createdBySupAdmin = true,
      requiresApproval = false
    } = flowData;

    try {
      // 1. Create business
      const businessQuery = `
        INSERT INTO business_profiles (
          business_name, business_type, registration_number, address,
          contact_email, contact_phone, status, requires_approval, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING business_id, business_name
      `;
      const businessResult = await client.query(businessQuery, [
        businessName, businessType, registrationNumber, address || null,
        contactEmail || null, contactPhone || null, status, requiresApproval
      ]);
      const businessId = businessResult.rows[0].business_id;

      // 2. Create ecotrust_scores
      const ecoQuery = `
        INSERT INTO ecotrust_scores (business_id, current_score, level, rank, created_at)
        VALUES ($1, 0, 'Newcomer', 'newcomer_rank', NOW())
        RETURNING business_id
      `;
      await client.query(ecoQuery, [businessId]);

      // 3. Create admin user
      const userQuery = `
        INSERT INTO users (
          business_id, username, email, password_hash, full_name, role,
          email_verified, is_active, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'admin', true, $6, NOW())
        RETURNING user_id, email, role
      `;
      const userResult = await client.query(userQuery, [
        businessId, adminUsername, adminEmail, adminPasswordHash, adminName, status === 'active'
      ]);
      const userId = userResult.rows[0].user_id;

      // 4. Log audit entry
      const auditQuery = `
        INSERT INTO audit_logs (
          business_id, user_id, event_type, action, entity_type, entity_id,
          message, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      const auditMessage = createdBySupAdmin
        ? 'Business created by super_admin'
        : 'Business self-registered (pending approval)';
      const auditEvent = createdBySupAdmin ? 'business_created_super_admin' : 'business_created_self_service';
      
      await client.query(auditQuery, [
        businessId, null, auditEvent, auditEvent, 'business', businessId, auditMessage
      ]);

      return {
        success: true,
        data: {
          businessId,
          businessName,
          userId,
          adminEmail,
          status,
          requiresApproval
        }
      };
    } catch (error) {
      return { success: false, error: this._handleDbError('createBusinessWithAdmin', error) };
    }
  },

  /**
   * ===== APPROVAL OPERATIONS =====
   */
  async approvePendingBusiness(client, businessId) {
    if (!client || this._isNil(businessId)) {
      return { success: false, error: 'client and businessId are required' };
    }

    try {
      // 1. Update business status
      const businessQuery = `
        UPDATE business_profiles
        SET status = 'active', requires_approval = false, updated_at = NOW()
        WHERE business_id = $1
        RETURNING business_id, business_name, contact_email
      `;
      const businessResult = await client.query(businessQuery, [businessId]);
      if (businessResult.rows.length === 0) {
        return { success: false, error: 'Business not found' };
      }
      const business = businessResult.rows[0];

      // 2. Activate admin user
      const userQuery = `
        UPDATE users
        SET is_active = true, updated_at = NOW()
        WHERE business_id = $1 AND role = 'admin'
        RETURNING user_id, email
      `;
      const userResult = await client.query(userQuery, [businessId]);
      if (userResult.rows.length === 0) {
        return { success: false, error: 'Admin user not found' };
      }
      const adminUser = userResult.rows[0];

      // 3. Log approval audit
      const auditQuery = `
        INSERT INTO audit_logs (
          business_id, user_id, event_type, action, entity_type, entity_id,
          message, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      await client.query(auditQuery, [
        businessId, null, 'business_approved_super_admin', 'business_approved', 'business', businessId,
        'Business approved and activated by super_admin'
      ]);

      return {
        success: true,
        data: {
          businessId,
          businessName: business.business_name,
          adminEmail: adminUser.email,
          status: 'active'
        }
      };
    } catch (error) {
      return { success: false, error: this._handleDbError('approvePendingBusiness', error) };
    }
  },

  /**
   * ===== REJECTION OPERATIONS =====
   */
  async rejectPendingBusiness(client, businessId, reason) {
    if (!client || this._isNil(businessId)) {
      return { success: false, error: 'client and businessId are required' };
    }

    try {
      // 1. Update business status
      const businessQuery = `
        UPDATE business_profiles
        SET status = 'rejected', updated_at = NOW()
        WHERE business_id = $1
        RETURNING business_id, business_name, contact_email
      `;
      const businessResult = await client.query(businessQuery, [businessId]);
      if (businessResult.rows.length === 0) {
        return { success: false, error: 'Business not found' };
      }
      const business = businessResult.rows[0];

      // 2. Deactivate admin user
      const userQuery = `
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE business_id = $1 AND role = 'admin'
        RETURNING user_id, email
      `;
      const userResult = await client.query(userQuery, [businessId]);
      const adminUser = userResult.rows[0] || {};

      // 3. Log rejection audit
      const auditQuery = `
        INSERT INTO audit_logs (
          business_id, user_id, event_type, action, entity_type, entity_id,
          message, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      await client.query(auditQuery, [
        businessId, null, 'business_rejected_super_admin', 'business_rejected', 'business', businessId,
        `Business rejected by super_admin. Reason: ${reason || 'Not provided'}`
      ]);

      return {
        success: true,
        data: {
          businessId,
          businessName: business.business_name,
          status: 'rejected',
          reason
        }
      };
    } catch (error) {
      return { success: false, error: this._handleDbError('rejectPendingBusiness', error) };
    }
  },

  /**
   * ===== QUERY OPERATIONS =====
   */
  async getPendingBusinesses(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT
          b.business_id, b.business_name, b.business_type, b.registration_number,
          b.contact_email, b.contact_phone, b.address, b.status, b.created_at,
          COUNT(u.user_id) FILTER (WHERE u.role = 'admin') as admin_count
        FROM business_profiles b
        LEFT JOIN users u ON b.business_id = u.business_id
        WHERE b.status = 'pending'
        GROUP BY
          b.business_id,
          b.business_name,
          b.business_type,
          b.registration_number,
          b.contact_email,
          b.contact_phone,
          b.address,
          b.status,
          b.created_at
        ORDER BY b.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const { rows } = await pool.query(query, [limit, offset]);

      const countQuery = 'SELECT COUNT(*) as total FROM business_profiles WHERE status = \'pending\'';
      const countResult = await pool.query(countQuery);

      return {
        success: true,
        data: {
          businesses: rows,
          total: parseInt(countResult.rows[0].total),
          limit,
          offset
        }
      };
    } catch (error) {
      return { success: false, error: this._handleDbError('getPendingBusinesses', error) };
    }
  },

  async getBusinessById(businessId) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'business_id is required' };
    }

    try {
      const query = `
        SELECT * FROM business_profiles WHERE business_id = $1
      `;
      const { rows } = await pool.query(query, [businessId]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('getBusinessById', error) };
    }
  }
};

module.exports = RegistrationModel;
