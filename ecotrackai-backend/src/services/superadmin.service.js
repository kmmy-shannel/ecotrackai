// ============================================================
// FILE: backend/src/services/superadmin.service.js
// LAYER: Business Logic — Super Admin Platform Operations
//
// COLUMN NAME FIXES (verified against actual Neon schema):
//
//   manager_approvals:
//     decided_by      → reviewed_by
//     decided_at      → reviewed_at
//     manager_comment → review_notes
//     (decision_notes also exists — used as fallback alias)
//
//   ecotrust_scores:
//     total_points    → current_score  (column does not exist as total_points)
//     level           → level          (correct, no change)
//
//   business_profiles: confirmed correct table name throughout
//   AuditModel.log() → AuditModel.logInvalidStatusTransition()
// ============================================================

const BusinessModel = require('../models/business.model');
const AuditModel    = require('../models/audit.model');
const pool          = require('../config/database');

const SuperAdminService = {

  // ─── HELPERS ──────────────────────────────────────────────

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
    const role   = user.role;

    if (this._isNil(userId) || this._isNil(role)) {
      return this._fail('Invalid user context');
    }

    if (role !== 'super_admin') {
      return this._fail('Only super_admin can access this resource', 403);
    }

    return this._ok({ userId, role });
  },

  // ─── BUSINESS REGISTRY ────────────────────────────────────

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

      const {
        businessName, businessType, registrationNumber,
        address, contactEmail, contactPhone
      } = body;

      if (!businessName || !businessType || !registrationNumber) {
        return this._fail('business_name, business_type, and registration_number are required');
      }

      const client = await pool.connect();
      let business;
      try {
        await client.query('BEGIN');

        const result = await BusinessModel.create({
          businessName, businessType, registrationNumber,
          address, contactEmail, contactPhone
        });

        if (!result.success) {
          await client.query('ROLLBACK');
          return result;
        }

        business = result.data;

        // System flow: EcoTrust record created immediately at 0 / Newcomer
        // No ON CONFLICT — ecotrust_scores has no unique constraint on business_id,
        // only a PK on score_id. Plain INSERT is correct.
        await client.query(
          `INSERT INTO ecotrust_scores (business_id, current_score, total_points_earned, level)
           VALUES ($1, 0, 0, 'Newcomer')`,
          [business.business_id]
        );

        await client.query('COMMIT');
      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      } finally {
        client.release();
      }

      return this._ok({
        business,
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

      // Audit failure must never block the suspension
      try {
        await AuditModel.logInvalidStatusTransition({
          businessId,
          userId:     ctxResult.data.userId,
          entityType: 'business',
          entityId:   businessId,
          fromStatus: 'active',
          toStatus:   'suspended',
          reason:     'Suspended by super_admin'
        });
      } catch (auditError) {
        console.warn('[SuperAdminService.suspendBusiness] Audit log failed:', auditError.message);
      }

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

  // ─── USER MANAGEMENT ─────────────────────────────────────

  async getSuperAdmins(user, limit = 50, offset = 0) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const { rows } = await pool.query(
        `SELECT user_id, username, email, full_name, is_active, created_at, last_login
         FROM users
         WHERE role = 'super_admin'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM users WHERE role = 'super_admin'`
      );

      return this._ok({
        super_admins: rows,
        pagination: { total: countResult.rows[0].total, limit, offset }
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

      const { rows } = await pool.query(
        `SELECT user_id, username, email, full_name, role, is_active, created_at, last_login
         FROM users
         WHERE business_id = $1 AND role = 'admin'
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [businessId, limit, offset]
      );

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

      const { rows } = await pool.query(
        `UPDATE users
         SET is_active = false
         WHERE user_id = $1 AND role != 'super_admin'
         RETURNING user_id, username, email, role, is_active`,
        [userId]
      );

      if (rows.length === 0) {
        return this._fail('User not found or cannot deactivate a super_admin', 404);
      }

      return this._ok({ user: rows[0], message: 'User deactivated successfully' });
    } catch (error) {
      console.error('[SuperAdminService.deactivateUser]', error);
      return this._fail('Failed to deactivate user');
    }
  },

  // ─── SYSTEM HEALTH ────────────────────────────────────────

  async getSystemHealth(user) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      // BusinessModel.getSystemStats() uses business_profiles — confirmed correct
      const statsResult = await BusinessModel.getSystemStats();
      if (!statsResult.success) return this._fail('Failed to fetch business stats');

      const stats = statsResult.data;

      const [alertsResult, approvalsResult, highRiskResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total FROM alerts
           WHERE DATE(created_at) = CURRENT_DATE`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total FROM manager_approvals
           WHERE status = 'pending'`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total FROM alerts
           WHERE risk_level = 'HIGH'`
        )
      ]);

      return this._ok({
        system_health: {
          total_businesses:     parseInt(stats.total_businesses     || 0),
          active_businesses:    parseInt(stats.active_businesses    || 0),
          suspended_businesses: parseInt(stats.suspended_businesses || 0),
          active_users:         parseInt(stats.total_users          || 0),
          super_admin_count:    parseInt(stats.super_admin_count    || 0),
          alerts_today:         alertsResult.rows[0].total,
          pending_approvals:    approvalsResult.rows[0].total,
          high_risk_alerts:     highRiskResult.rows[0].total,
          system_status:        'operational',
          timestamp:            new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[SuperAdminService.getSystemHealth]', error);
      return this._fail('Failed to fetch system health');
    }
  },

  // ─── AUDIT LOGS ───────────────────────────────────────────

  async getAuditLogs(user, filters = {}) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const {
        businessId, startDate, endDate, eventType,
        limit = 100, offset = 0
      } = filters;

      const conditions = ['1=1'];
      const values     = [];
      let   idx        = 1;

      if (!this._isNil(businessId)) {
        conditions.push(`ma.business_id = $${idx++}`);
        values.push(businessId);
      }
      if (!this._isNil(eventType)) {
        conditions.push(`ma.approval_type = $${idx++}`);
        values.push(eventType);
      }
      if (!this._isNil(startDate)) {
        conditions.push(`ma.created_at >= $${idx++}`);
        values.push(startDate);
      }
      if (!this._isNil(endDate)) {
        conditions.push(`ma.created_at <= $${idx++}`);
        values.push(endDate);
      }

      values.push(limit, offset);

      // FIXED COLUMN NAMES (verified against Neon schema):
      //   decided_by  → reviewed_by
      //   decided_at  → reviewed_at
      //   manager_comment → review_notes
      const { rows } = await pool.query(
        `SELECT
           ma.approval_id,
           ma.business_id,
           bp.business_name,
           ma.approval_type                              AS event_type,
           ma.status,
           ma.risk_level,
           ma.ai_suggestion,
           COALESCE(ma.review_notes, ma.decision_notes) AS reason,
           ma.reviewed_by                               AS decided_by,
           u.full_name                                  AS decided_by_name,
           ma.reviewed_at                               AS decided_at,
           ma.created_at
         FROM manager_approvals ma
         LEFT JOIN business_profiles bp ON bp.business_id = ma.business_id
         LEFT JOIN users             u  ON u.user_id      = ma.reviewed_by
         WHERE ${conditions.join(' AND ')}
         ORDER BY ma.created_at DESC
         LIMIT $${idx++} OFFSET $${idx}`,
        values
      );

      return this._ok({
        audit_logs:  rows,
        pagination:  { limit, offset, returned: rows.length }
      });
    } catch (error) {
      console.error('[SuperAdminService.getAuditLogs]', error);
      return this._fail('Failed to fetch audit logs');
    }
  },

  // ─── ANALYTICS ────────────────────────────────────────────

  async getCrossBusinessAnalytics(user, timeRange = 30) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const safeRange = Number.isFinite(Number(timeRange))
        ? Math.max(1, Number(timeRange))
        : 30;

      const pickColumn = (columns, candidates) => {
        for (const candidate of candidates) {
          if (columns.includes(candidate)) return candidate;
        }
        return null;
      };

      // Introspect carbon_footprint_records columns
      const carbonColumnsResult = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name   = 'carbon_footprint_records'
      `);
      const carbonColumns        = carbonColumnsResult.rows.map(r => r.column_name);
      const carbonDateCol        = pickColumn(carbonColumns, ['created_at', 'recorded_at', 'updated_at']);
      const carbonEmissionCol    = pickColumn(carbonColumns, [
        'total_carbon_kg', 'transportation_carbon_kg',
        'actual_co2_kg', 'estimated_co2_kg', 'co2_kg', 'emission_amount'
      ]);
      const carbonBusinessCol    = pickColumn(carbonColumns, ['business_id']);

      let carbonRows = [];
      if (carbonDateCol && carbonBusinessCol) {
        const sumExpr = carbonEmissionCol
          ? `COALESCE(SUM(c.${carbonEmissionCol}), 0)`
          : '0::numeric';
        const { rows } = await pool.query(
          `SELECT
             DATE(c.${carbonDateCol})                     AS date,
             ${sumExpr}                                   AS total_emissions,
             COUNT(DISTINCT c.${carbonBusinessCol})::int  AS businesses_active
           FROM carbon_footprint_records c
           WHERE c.${carbonDateCol} >= NOW() - ($1::text || ' days')::interval
           GROUP BY DATE(c.${carbonDateCol})
           ORDER BY date DESC`,
          [safeRange]
        );
        carbonRows = rows;
      }

      // Alert distribution
      const alertColumnsResult = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'alerts'
      `);
      const alertColumns    = alertColumnsResult.rows.map(r => r.column_name);
      const alertDateCol    = pickColumn(alertColumns, ['created_at']);
      const alertTypeCol    = pickColumn(alertColumns, ['alert_type', 'risk_level']);

      let alertRows = [];
      if (alertDateCol && alertTypeCol) {
        const { rows } = await pool.query(
          `SELECT
             ${alertTypeCol} AS alert_type,
             COUNT(*)::int   AS count
           FROM alerts
           WHERE ${alertDateCol} >= NOW() - ($1::text || ' days')::interval
           GROUP BY ${alertTypeCol}`,
          [safeRange]
        );
        alertRows = rows;
      }

      // Approval rates — FROM business_profiles (not businesses)
     // Approval rates — FROM business_profiles (not businesses)
const { rows: approvalRows } = await pool.query(
  `SELECT
     bp.business_id,
     bp.business_name,
     COUNT(ma.approval_id) FILTER (WHERE ma.status = 'approved')::int AS approved_count,
     COUNT(ma.approval_id) FILTER (WHERE ma.status = 'rejected')::int AS rejected_count,
     COUNT(ma.approval_id)::int                                        AS total_approvals
   FROM business_profiles bp
   LEFT JOIN manager_approvals ma
          ON bp.business_id = ma.business_id
         AND ma.created_at >= NOW() - ($1::text || ' days')::interval
   GROUP BY bp.business_id, bp.business_name
   ORDER BY total_approvals DESC`,
  [safeRange]
);

      // EcoTrust leaderboard
      // FIXED: current_score (not total_points — column does not exist)
      // FIXED: WHERE status = 'active' (not is_active = true)
      const { rows: leaderboardRows } = await pool.query(
        `SELECT
           bp.business_id,
           bp.business_name,
           COALESCE(es.current_score, 0) AS total_points,
           COALESCE(es.level, 'Newcomer') AS level
         FROM business_profiles bp
         LEFT JOIN ecotrust_scores es ON es.business_id = bp.business_id
         WHERE bp.status = 'active'
         ORDER BY es.current_score DESC NULLS LAST
         LIMIT 20`
      );

      return this._ok({
        analytics: {
          time_range_days:      safeRange,
          carbon_trends:        carbonRows,
          alert_distribution:   alertRows,
          approval_rates:       approvalRows,
          ecotrust_leaderboard: leaderboardRows,
          generated_at:         new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[SuperAdminService.getCrossBusinessAnalytics]', error);
      return this._fail('Failed to fetch analytics');
    }
  },
   
async getFlaggedTransactions(user) {
  try {
    const ctxResult = this._extractSuperAdminContext(user);
    if (!ctxResult.success) return ctxResult;
 
    const { rows } = await pool.query(
      `SELECT
         et.transaction_id,
         et.business_id,
         bp.business_name,
         et.action_type,
         et.points_earned,
         et.verification_status,
         et.related_record_type,
         et.related_record_id,
         et.flagged,
         et.flag_reason,
         et.flagged_by,
         et.flagged_at,
         et.created_at,
         u.full_name AS flagged_by_name
       FROM ecotrust_transactions et
       LEFT JOIN business_profiles bp ON bp.business_id = et.business_id
       LEFT JOIN users             u  ON u.user_id      = et.flagged_by
       WHERE et.flagged = TRUE
       ORDER BY et.flagged_at DESC`
    );
 
    return this._ok({ flagged_transactions: rows });
  } catch (error) {
    console.error('[SuperAdminService.getFlaggedTransactions]', error);
    return this._fail('Failed to fetch flagged transactions');
  }
},
 
async dismissFlaggedTransaction(user, transactionId) {
  try {
    const ctxResult = this._extractSuperAdminContext(user);
    if (!ctxResult.success) return ctxResult;
 
    if (!transactionId) return this._fail('transactionId is required');
 
    const { rows } = await pool.query(
      `UPDATE ecotrust_transactions
       SET
         flagged     = FALSE,
         flag_reason = NULL,
         flagged_by  = NULL,
         flagged_at  = NULL
       WHERE transaction_id = $1
       RETURNING transaction_id, business_id, action_type, flagged`,
      [transactionId]
    );
 
    if (rows.length === 0) return this._fail('Transaction not found', 404);
 
    return this._ok({ transaction: rows[0], message: 'Flag dismissed by Super Admin' });
  } catch (error) {
    console.error('[SuperAdminService.dismissFlaggedTransaction]', error);
    return this._fail('Failed to dismiss flag');
  }
},
};


module.exports = SuperAdminService;