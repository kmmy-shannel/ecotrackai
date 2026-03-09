// ============================================================
// FILE: backend/src/services/superadmin.service.js
// LAYER: Business Logic — Super Admin Platform Operations
// PURPOSE: All platform-level operations (non-business-specific)
// ============================================================

const BusinessModel = require('../models/business.model');
const UserModel = require('../models/user.model');
const AuditModel = require('../models/audit.model');
const pool = require('../config/database');

const SuperAdminService = {

  _ok(data = null) {
    return { success: true, data };
  },

  _fail(error, statusCode = 400) {
    return { success: false, error, statusCode };
  },

  _isNil(value) {
    return value === null || value === undefined;
  },

  _extractSuperAdminContext(user) {
    console.log('[SuperAdmin Context] user:', user);
    console.log('[SuperAdmin Context] role:', user?.role);

    if (!user || typeof user !== 'object') {
      return this._fail('User context is required');
    }

    const userId = user.userId || user.user_id;
    const role = user.role;

    if (this._isNil(userId) || this._isNil(role)) {
      return this._fail('Invalid user context');
    }

    if (role !== 'super_admin') {
      return this._fail('Only super_admin can access this resource', 403);
    }

    return this._ok({ userId, role });
  },

  /**
   * ===== BUSINESS REGISTRY OPERATIONS =====
   */
  async getAllBusinesses(user, limit = 50, offset = 0) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const result = await BusinessModel.findAll(limit, offset);
      if (!result.success) return result;

      return this._ok({
        businesses: result.data.businesses,
        pagination: { total: result.data.total, limit, offset }
      });
    } catch (error) {
      console.error('[SuperAdminService.getAllBusinesses]', error);
      return this._fail('Failed to fetch businesses');
    }
  },

  async getBusinessById(user, businessId) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (this._isNil(businessId)) {
        return this._fail('business_id is required');
      }

      const result = await BusinessModel.findById(businessId);
      if (!result.success) return result;
      if (!result.data) {
        return this._fail('Business not found', 404);
      }

      return this._ok(result.data);
    } catch (error) {
      console.error('[SuperAdminService.getBusinessById]', error);
      return this._fail('Failed to fetch business');
    }
  },

  async createBusiness(user, body) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (!body || typeof body !== 'object') {
        return this._fail('Request body is required');
      }

      const { businessName, businessType, registrationNumber, address, contactEmail, contactPhone } = body;

      if (!businessName || !businessType || !registrationNumber) {
        return this._fail('business_name, business_type, and registration_number are required');
      }

      const result = await BusinessModel.create({
        businessName, businessType, registrationNumber, address, contactEmail, contactPhone
      });
      if (!result.success) return result;

      return this._ok({
        business: result.data,
        message: 'Business created successfully. Admin account must be created separately.'
      });
    } catch (error) {
      console.error('[SuperAdminService.createBusiness]', error);
      return this._fail('Failed to create business');
    }
  },

  async updateBusiness(user, businessId, body) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (this._isNil(businessId) || !body || typeof body !== 'object') {
        return this._fail('business_id and request body are required');
      }

      const result = await BusinessModel.updateProfile(businessId, body);
      if (!result.success) return result;

      return this._ok({ business: result.data, message: 'Business updated successfully' });
    } catch (error) {
      console.error('[SuperAdminService.updateBusiness]', error);
      return this._fail('Failed to update business');
    }
  },

  async suspendBusiness(user, businessId) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (this._isNil(businessId)) {
        return this._fail('business_id is required');
      }

      const result = await BusinessModel.updateStatus(businessId, false);
      if (!result.success) return result;

      // AUDIT: Log suspension
      await AuditModel.logInvalidStatusTransition({
        businessId,
        userId: ctxResult.data.userId,
        event_type: 'business_suspended',
        action: 'business_suspended',
        entity_type: 'business',
        entity_id: businessId,
        reason: 'Suspended by super_admin'
      });

      return this._ok({ business: result.data, message: 'Business suspended successfully' });
    } catch (error) {
      console.error('[SuperAdminService.suspendBusiness]', error);
      return this._fail('Failed to suspend business');
    }
  },

  async reactivateBusiness(user, businessId) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (this._isNil(businessId)) {
        return this._fail('business_id is required');
      }

      const result = await BusinessModel.updateStatus(businessId, true);
      if (!result.success) return result;

      return this._ok({ business: result.data, message: 'Business reactivated successfully' });
    } catch (error) {
      console.error('[SuperAdminService.reactivateBusiness]', error);
      return this._fail('Failed to reactivate business');
    }
  },

  /**
   * ===== USER MANAGEMENT OPERATIONS =====
   */
  async getSuperAdmins(user, limit = 50, offset = 0) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const query = `
        SELECT user_id, username, email, full_name, is_active, created_at, last_login
        FROM users
        WHERE role = 'super_admin'
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const { rows } = await pool.query(query, [limit, offset]);

      const countQuery = 'SELECT COUNT(*) as total FROM users WHERE role = \'super_admin\'';
      const countResult = await pool.query(countQuery);
      const total = parseInt(countResult.rows[0].total);

      return this._ok({
        super_admins: rows,
        pagination: { total, limit, offset }
      });
    } catch (error) {
      console.error('[SuperAdminService.getSuperAdmins]', error);
      return this._fail('Failed to fetch super admins');
    }
  },

  async getAdminsByBusiness(user, businessId, limit = 50, offset = 0) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (this._isNil(businessId)) {
        return this._fail('business_id is required');
      }

      const query = `
        SELECT user_id, username, email, full_name, role, is_active, created_at, last_login
        FROM users
        WHERE business_id = $1 AND role = 'admin'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const { rows } = await pool.query(query, [businessId, limit, offset]);

      return this._ok({
        admins: rows,
        pagination: { total: rows.length, limit, offset }
      });
    } catch (error) {
      console.error('[SuperAdminService.getAdminsByBusiness]', error);
      return this._fail('Failed to fetch business admins');
    }
  },

  async deactivateUser(user, userId) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (this._isNil(userId)) {
        return this._fail('user_id is required');
      }

      const query = `
        UPDATE users
        SET is_active = false
        WHERE user_id = $1 AND role != 'super_admin'
        RETURNING user_id, username, email, role, is_active
      `;
      const { rows } = await pool.query(query, [userId]);

      if (rows.length === 0) {
        return this._fail('User not found or is super_admin', 404);
      }

      return this._ok({ user: rows[0], message: 'User deactivated successfully' });
    } catch (error) {
      console.error('[SuperAdminService.deactivateUser]', error);
      return this._fail('Failed to deactivate user');
    }
  },

  /**
   * ===== SYSTEM HEALTH OPERATIONS =====
   */
  async getSystemHealth(user) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const businessStatsResult = await BusinessModel.getSystemStats();
      if (!businessStatsResult.success) return businessStatsResult;

      const businessStats = businessStatsResult.data;

      // Get today's alerts count
      const alertsQuery = `
        SELECT COUNT(*) as total FROM alerts WHERE DATE(created_at) = CURRENT_DATE
      `;
      const alertsResult = await pool.query(alertsQuery);
      const alertsToday = parseInt(alertsResult.rows[0].total);

      // Get pending approvals count
      const approvalsQuery = `
        SELECT COUNT(*) as total FROM manager_approvals WHERE status = 'pending'
      `;
      const approvalsResult = await pool.query(approvalsQuery);
      const pendingApprovals = parseInt(approvalsResult.rows[0].total);

      // Get high-risk products
      const highRiskQuery = `
        SELECT COUNT(*) as total FROM alerts WHERE risk_level = 'HIGH'
      `;
      const highRiskResult = await pool.query(highRiskQuery);
      const highRiskAlerts = parseInt(highRiskResult.rows[0].total);

      return this._ok({
        system_health: {
          ...businessStats,
          alerts_today: alertsToday,
          pending_approvals: pendingApprovals,
          high_risk_alerts: highRiskAlerts,
          system_status: 'operational',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[SuperAdminService.getSystemHealth]', error);
      return this._fail('Failed to fetch system health');
    }
  },

  /**
   * ===== AUDIT LOG OPERATIONS =====
   */
  async getAuditLogs(user, filters = {}) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const { businessId, startDate, endDate, eventType, limit = 100, offset = 0 } = filters;

      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const values = [];

      if (!this._isNil(businessId)) {
        values.push(businessId);
        query += ` AND business_id = $${values.length}`;
      }

      if (!this._isNil(eventType)) {
        values.push(eventType);
        query += ` AND event_type = $${values.length}`;
      }

      if (!this._isNil(startDate)) {
        values.push(startDate);
        query += ` AND created_at >= $${values.length}`;
      }

      if (!this._isNil(endDate)) {
        values.push(endDate);
        query += ` AND created_at <= $${values.length}`;
      }

      values.push(limit);
      query += ` ORDER BY created_at DESC LIMIT $${values.length}`;

      values.push(offset);
      query += ` OFFSET $${values.length}`;

      const { rows } = await pool.query(query, values);
      
      return this._ok({
        audit_logs: rows,
        pagination: { limit, offset, returned: rows.length }
      });
    } catch (error) {
      console.error('[SuperAdminService.getAuditLogs]', error);
      return this._fail('Failed to fetch audit logs');
    }
  },

  /**
   * ===== ANALYTICS OPERATIONS =====
   */
  async getCrossBusinessAnalytics(user, timeRange = 30) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const safeRange = Number.isFinite(Number(timeRange)) ? Math.max(1, Number(timeRange)) : 30;
      const pickColumn = (columns, candidates) => {
        for (const candidate of candidates) {
          if (columns.includes(candidate)) return candidate;
        }
        return null;
      };

      // Carbon emissions trend (schema-safe against column drift).
      const carbonColumnsResult = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'carbon_footprint_records'
      `);
      const carbonColumns = carbonColumnsResult.rows.map((row) => row.column_name);
      const carbonDateColumn = pickColumn(carbonColumns, ['created_at', 'recorded_at', 'updated_at']);
      const carbonEmissionColumn = pickColumn(carbonColumns, [
        'total_carbon_kg',
        'transportation_carbon_kg',
        'actual_co2_kg',
        'estimated_co2_kg',
        'co2_kg',
        'emission_amount'
      ]);
      const carbonBusinessColumn = pickColumn(carbonColumns, ['business_id']);

      let carbonRows = [];
      if (carbonDateColumn && carbonBusinessColumn) {
        const sumExpr = carbonEmissionColumn
          ? `COALESCE(SUM(c.${carbonEmissionColumn}), 0)`
          : '0::numeric';

        const carbonQuery = `
          SELECT
            DATE(c.${carbonDateColumn}) AS date,
            ${sumExpr} AS total_emissions,
            COUNT(DISTINCT c.${carbonBusinessColumn}) AS businesses_active
          FROM carbon_footprint_records c
          WHERE c.${carbonDateColumn} >= NOW() - ($1::text || ' days')::interval
          GROUP BY DATE(c.${carbonDateColumn})
          ORDER BY date DESC
        `;
        const carbonResult = await pool.query(carbonQuery, [safeRange]);
        carbonRows = carbonResult.rows;
      }

      // Alert distribution by type
      const alertsColumnsResult = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'alerts'
      `);
      const alertColumns = alertsColumnsResult.rows.map((row) => row.column_name);
      const alertDateColumn = pickColumn(alertColumns, ['created_at']);
      const alertTypeColumn = pickColumn(alertColumns, ['alert_type', 'risk_level']);

      let alertRows = [];
      if (alertDateColumn && alertTypeColumn) {
        const alertsQuery = `
          SELECT
            ${alertTypeColumn} AS alert_type,
            COUNT(*) AS count
          FROM alerts
          WHERE ${alertDateColumn} >= NOW() - ($1::text || ' days')::interval
          GROUP BY ${alertTypeColumn}
        `;
        const alertsResult = await pool.query(alertsQuery, [safeRange]);
        alertRows = alertsResult.rows;
      }

      // Approval rate by business
      const approvalsQuery = `
        SELECT
          b.business_id,
          b.business_name,
          COUNT(CASE WHEN ma.status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN ma.status = 'rejected' THEN 1 END) as rejected_count,
          COUNT(*) as total_approvals
        FROM business_profiles b
        LEFT JOIN manager_approvals ma
          ON b.business_id = ma.business_id
         AND ma.created_at >= NOW() - ($1::text || ' days')::interval
        GROUP BY b.business_id, b.business_name
        ORDER BY total_approvals DESC
      `;
      const approvalsResult = await pool.query(approvalsQuery, [safeRange]);

      return this._ok({
        analytics: {
          time_range_days: safeRange,
          carbon_trends: carbonRows,
          alert_distribution: alertRows,
          approval_rates: approvalsResult.rows,
          generated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[SuperAdminService.getCrossBusinessAnalytics]', error);
      return this._fail('Failed to fetch analytics');
    }
  }
};

module.exports = SuperAdminService;
