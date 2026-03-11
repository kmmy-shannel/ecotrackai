// ============================================================
// FILE: backend/src/models/superadmin.model.js
// LAYER: Model — Raw database queries
// PURPOSE: All SQL for Super Admin cross-business operations
// NOTE: Uses pool.query() pattern consistent with inventory.model.js
// ============================================================

const pool = require('../config/database');

const SuperAdminModel = {

  // ─── BUSINESS REGISTRY ────────────────────────────────────

  async getAllBusinesses(limit = 50, offset = 0) {
    const { rows } = await pool.query(
      `SELECT
         b.business_id,
         b.business_name,
         b.business_type,
         b.registration_number,
         b.address,
         b.contact_email,
         b.contact_phone,
         b.status,
         b.created_at,
         COALESCE(es.total_points, 0)  AS ecotrust_points,
         COALESCE(es.level, 'Newcomer') AS ecotrust_level,
         COUNT(DISTINCT u.user_id)::int AS user_count
       FROM businesses b
       LEFT JOIN ecotrust_scores   es ON es.business_id = b.business_id
       LEFT JOIN users             u  ON u.business_id  = b.business_id
                                     AND u.is_active    = true
       GROUP BY b.business_id, es.total_points, es.level
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  async getBusinessById(businessId) {
    const { rows } = await pool.query(
      `SELECT
         b.*,
         COALESCE(es.total_points, 0)   AS ecotrust_points,
         COALESCE(es.level, 'Newcomer') AS ecotrust_level
       FROM businesses b
       LEFT JOIN ecotrust_scores es ON es.business_id = b.business_id
       WHERE b.business_id = $1`,
      [businessId]
    );
    return rows[0] || null;
  },

  async createBusiness(data) {
    const {
      businessName,
      businessType,
      registrationNumber,
      address,
      contactEmail,
      contactPhone
    } = data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert business
      const bizResult = await client.query(
        `INSERT INTO businesses
           (business_name, business_type, registration_number, address,
            contact_email, contact_phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING *`,
        [businessName, businessType, registrationNumber,
         address || null, contactEmail || null, contactPhone || null]
      );
      const business = bizResult.rows[0];

      // 2. Create EcoTrust score record starting at 0
      await client.query(
        `INSERT INTO ecotrust_scores (business_id, total_points, level)
         VALUES ($1, 0, 'Newcomer')`,
        [business.business_id]
      );

      await client.query('COMMIT');
      return business;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateBusiness(businessId, data) {
    const { businessName, businessType, address, contactEmail, contactPhone } = data;
    const { rows } = await pool.query(
      `UPDATE businesses
       SET business_name    = COALESCE($1, business_name),
           business_type    = COALESCE($2, business_type),
           address          = COALESCE($3, address),
           contact_email    = COALESCE($4, contact_email),
           contact_phone    = COALESCE($5, contact_phone)
       WHERE business_id = $6
       RETURNING *`,
      [businessName || null, businessType || null, address || null,
       contactEmail || null, contactPhone || null, businessId]
    );
    return rows[0] || null;
  },

  async setBusinessStatus(businessId, status) {
    const { rows } = await pool.query(
      `UPDATE businesses
       SET status = $1
       WHERE business_id = $2
       RETURNING *`,
      [status, businessId]
    );
    return rows[0] || null;
  },

  // ─── USER MANAGEMENT ─────────────────────────────────────

  async getSuperAdmins(limit = 50, offset = 0) {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, role, is_active, created_at
       FROM users
       WHERE role = 'super_admin'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  async getAdminsByBusiness(businessId, limit = 50, offset = 0) {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, role, is_active, created_at
       FROM users
       WHERE business_id = $1
         AND role = 'admin'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, limit, offset]
    );
    return rows;
  },

  async setUserActiveStatus(userId, isActive) {
    const { rows } = await pool.query(
      `UPDATE users
       SET is_active = $1
       WHERE user_id = $2
       RETURNING user_id, full_name, email, role, is_active`,
      [isActive, userId]
    );
    return rows[0] || null;
  },

  // ─── SYSTEM HEALTH ────────────────────────────────────────

  async getSystemHealth() {
    // Run all counts in parallel for performance
    const [
      totalBusinesses,
      activeBusinesses,
      pendingApprovals,
      alertsToday,
      totalUsers,
      recentDeliveries
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM businesses`),
      pool.query(`SELECT COUNT(*)::int AS count FROM businesses WHERE status = 'active'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM manager_approvals WHERE status = 'pending'`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM alerts
         WHERE DATE(created_at) = CURRENT_DATE`
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = true`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM delivery_routes
         WHERE created_at >= NOW() - INTERVAL '7 days'`
      )
    ]);

    return {
      totalBusinesses:   totalBusinesses.rows[0].count,
      activeBusinesses:  activeBusinesses.rows[0].count,
      pendingApprovals:  pendingApprovals.rows[0].count,
      alertsToday:       alertsToday.rows[0].count,
      activeUsers:       totalUsers.rows[0].count,
      recentDeliveries:  recentDeliveries.rows[0].count
    };
  },

  // ─── AUDIT LOGS ───────────────────────────────────────────

  async getAuditLogs({ businessId, startDate, endDate, eventType, limit = 100, offset = 0 }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (businessId) {
      conditions.push(`ma.business_id = $${idx++}`);
      params.push(businessId);
    }
    if (startDate) {
      conditions.push(`ma.created_at >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`ma.created_at <= $${idx++}`);
      params.push(endDate);
    }
    if (eventType) {
      conditions.push(`ma.approval_type = $${idx++}`);
      params.push(eventType);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT
         ma.approval_id,
         ma.business_id,
         b.business_name,
         ma.approval_type,
         ma.status,
         ma.risk_level,
         ma.ai_suggestion,
         ma.manager_comment,
         ma.decided_by,
         u.full_name   AS decided_by_name,
         ma.decided_at,
         ma.created_at
       FROM manager_approvals ma
       LEFT JOIN businesses b ON b.business_id = ma.business_id
       LEFT JOIN users      u ON u.user_id      = ma.decided_by
       ${whereClause}
       ORDER BY ma.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    return rows;
  },

  // ─── ANALYTICS ────────────────────────────────────────────

  async getCrossBusinessAnalytics(days = 30) {
    const [carbonRows, ecoTrustRows, deliveryRows, alertRows] = await Promise.all([

      // CO2 per business over time range
      pool.query(
        `SELECT
           b.business_id,
           b.business_name,
           COALESCE(SUM(cf.co2_kg), 0)::numeric(10,2) AS total_co2,
           COUNT(cf.record_id)::int                    AS delivery_count
         FROM businesses b
         LEFT JOIN carbon_footprint_records cf
                ON cf.business_id = b.business_id
               AND cf.created_at >= NOW() - ($1 || ' days')::interval
               AND cf.status = 'verified'
         GROUP BY b.business_id, b.business_name
         ORDER BY total_co2 DESC`,
        [days]
      ),

      // EcoTrust leaderboard
      pool.query(
        `SELECT
           b.business_id,
           b.business_name,
           COALESCE(es.total_points, 0) AS total_points,
           COALESCE(es.level, 'Newcomer') AS level
         FROM businesses b
         LEFT JOIN ecotrust_scores es ON es.business_id = b.business_id
         WHERE b.status = 'active'
         ORDER BY es.total_points DESC NULLS LAST
         LIMIT 20`
      ),

      // Delivery counts per business
      pool.query(
        `SELECT
           b.business_id,
           b.business_name,
           COUNT(dr.route_id)::int AS total_deliveries,
           COUNT(CASE WHEN dr.status = 'completed' THEN 1 END)::int AS completed_deliveries
         FROM businesses b
         LEFT JOIN delivery_routes dr
                ON dr.business_id = b.business_id
               AND dr.created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY b.business_id, b.business_name
         ORDER BY total_deliveries DESC`,
        [days]
      ),

      // Alert summary
      pool.query(
        `SELECT
           risk_level,
           COUNT(*)::int AS count
         FROM alerts
         WHERE created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY risk_level`,
        [days]
      )
    ]);

    return {
      carbonByBusiness:   carbonRows.rows,
      ecoTrustLeaderboard: ecoTrustRows.rows,
      deliveryStats:       deliveryRows.rows,
      alertSummary:        alertRows.rows
    };
  },

  // ─── ECOTRUST CONFIG ──────────────────────────────────────

  // Find these functions — if they don't exist, ADD them at the bottom before module.exports

async getEcoTrustConfig() {
  const result = await pool.query(
    `SELECT action_id, action_name, action_category, points_value, description
     FROM sustainable_actions
     ORDER BY action_id ASC`
  );
  return result.rows;
},

async updateEcoTrustAction(actionId, { points_value, action_name, action_category, description }) {
  const result = await pool.query(
    `UPDATE sustainable_actions
     SET points_value    = COALESCE($1, points_value),
         action_name     = COALESCE($2, action_name),
         action_category = COALESCE($3, action_category),
         description     = COALESCE($4, description)
     WHERE action_id = $5
     RETURNING *`,
    [points_value, action_name, action_category, description, actionId]
  );
  return result.rows[0] || null;
},
};

module.exports = SuperAdminModel;