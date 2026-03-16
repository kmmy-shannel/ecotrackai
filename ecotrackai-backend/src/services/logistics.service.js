// ============================================================
// FILE: src/services/logistics.service.js
// ============================================================
const pool = require('../config/database');

const LogisticsService = {
  _ok:   (data) => ({ success: true, data }),
  _fail: (msg)  => ({ success: false, error: msg }),

  // ── Pending approval cards ───────────────────────────────
  async getPendingRoutes(user) {
    try {
      const { rows } = await pool.query(`
        SELECT
          ma.*,
          dr.status        AS route_status,
          dr.vehicle_type,
          drv.full_name    AS driver_full_name,
          dr.total_distance_km,
          dr.estimated_fuel_consumption_liters,
          dr.estimated_carbon_kg,
          dr.estimated_duration_minutes,
          ro.optimized_distance,
          ro.optimized_fuel,
          ro.optimized_carbon_kg,
          ro.savings_km,
          ro.savings_fuel,
          ro.savings_co2,
          ro.ai_recommendation,
          u.full_name AS submitted_by_name
        FROM manager_approvals ma
        LEFT JOIN delivery_routes    dr  ON dr.route_id   = ma.delivery_id
        LEFT JOIN route_optimizations ro  ON ro.route_id   = ma.delivery_id
        LEFT JOIN users               u   ON u.user_id     = ma.submitted_by
        LEFT JOIN users               drv ON drv.user_id   = dr.driver_user_id
        WHERE ma.business_id  = $1
          AND ma.approval_type = 'route_optimization'
          AND ma.status        = 'pending'
        ORDER BY ma.created_at DESC
      `, [user.businessId]);
      return this._ok(rows);
    } catch (e) {
      console.error('[LogisticsService.getPendingRoutes]', e);
      return this._fail(e.message);
    }
  },

  // ── History ──────────────────────────────────────────────
  async getRouteHistory(user) {
    try {
       const { rows } = await pool.query(`
        SELECT
          ma.*,
          dr.vehicle_type,
          drv.full_name    AS driver_full_name,
          dl.actual_distance_km,
          dl.actual_fuel_used_liters,
          dl.actual_carbon_kg,
          u.full_name AS reviewed_by_name
        FROM manager_approvals ma
       LEFT JOIN delivery_routes dr  ON dr.route_id  = ma.delivery_id
        LEFT JOIN delivery_logs   dl  ON dl.route_id  = ma.delivery_id
        LEFT JOIN users           u   ON u.user_id    = ma.reviewed_by
        LEFT JOIN users           drv ON drv.user_id  = dr.driver_user_id
        WHERE ma.business_id   = $1
          AND ma.approval_type = 'route_optimization'
          AND ma.status       <> 'pending'
        ORDER BY ma.created_at DESC
        LIMIT 50
      `, [user.businessId]);
      return this._ok(rows);
    } catch (e) {
      console.error('[LogisticsService.getRouteHistory]', e);
      return this._fail(e.message);
    }
  },

  // ── Approve ──────────────────────────────────────────────
  async approveRoute(approvalId, user, body = {}) {
    try {
      const businessId = user.businessId || user.business_id;
      const reviewerUserId = user.userId || user.user_id;

      // Get the approval record
      const { rows: approvals } = await pool.query(
        `SELECT * FROM manager_approvals WHERE approval_id=$1 AND business_id=$2`,
        [approvalId, businessId]
      );
      if (!approvals[0]) return this._fail('Approval not found');
      const approval = approvals[0];
      if (approval.status !== 'pending') return this._fail('Already reviewed');

      const parsedDriverUserId = Number(body.driverUserId || body.driver_user_id || 0) || null;
      if (parsedDriverUserId) {
        const { rowCount } = await pool.query(
          `SELECT 1 FROM users WHERE user_id = $1 AND business_id = $2 AND role = 'driver' AND is_active = TRUE`,
          [parsedDriverUserId, businessId]
        );
        if (rowCount === 0) return this._fail('Selected driver is invalid or inactive');
      }

      // Update approval
      await pool.query(`
        UPDATE manager_approvals
        SET status='approved', decision='approved',
            reviewed_by=$1, reviewed_at=NOW(),
            manager_comment=$2, decided_by_role=$3, decision_date=NOW()
        WHERE approval_id=$4
      `, [reviewerUserId, body.comment || '', user.role, approvalId]);

      // Update route status → approved
await pool.query(
  `UPDATE delivery_routes
   SET status = 'approved',
       driver_user_id = COALESCE($3, driver_user_id),
       updated_at = NOW()
   WHERE route_id = $1 AND business_id = $2`,
  [approval.delivery_id, businessId, parsedDriverUserId]
);

      // Permanently deduct reserved inventory now that route is approved
      try {
        const DeliveryService = require('./delivery.service');
        await DeliveryService._confirmRouteReservations(approval.delivery_id, businessId);
      } catch (reservationError) {
        console.error('[LogisticsService.approveRoute][reservations]', reservationError.message);
      }

      // Mark optimization as approved
      await pool.query(
        `UPDATE route_optimizations SET status='approved' WHERE route_id=$1`,
        [approval.delivery_id]
      );

      // Award EcoTrust points
      try {
        await pool.query(`
          INSERT INTO ecotrust_transactions
            (business_id, action_id, action_type, points_earned,
             related_record_type, related_record_id, verification_status, transaction_date, created_at)
          SELECT $1, action_id, 'Route Optimization Approved', points_value,
                 'delivery', $2, 'pending', CURRENT_DATE, NOW()
          FROM sustainable_actions WHERE action_name='Route Optimization Approved' LIMIT 1
        `, [businessId, approval.delivery_id]);
      } catch (ecotrustError) {
        // Keep the core route-approval flow successful even if optional points logging fails.
        console.error('[LogisticsService.approveRoute][ecotrust]', ecotrustError.message);
      }

      return this._ok({ message: 'Route approved. Driver has been notified.' });
    } catch (e) {
      console.error('[LogisticsService.approveRoute]', e);
      return this._fail(e.message);
    }
  },

  // ── Decline ──────────────────────────────────────────────
  async declineRoute(approvalId, user, body = {}) {
    try {
      const { rows: approvals } = await pool.query(
        `SELECT * FROM manager_approvals WHERE approval_id=$1 AND business_id=$2`,
        [approvalId, user.businessId]
      );
      if (!approvals[0]) return this._fail('Approval not found');
      const approval = approvals[0];
      if (approval.status !== 'pending') return this._fail('Already reviewed');

      if (!body.reason) return this._fail('Decline reason is required');

      await pool.query(`
        UPDATE manager_approvals
        SET status='rejected', decision='rejected',
            reviewed_by=$1, reviewed_at=NOW(),
            manager_comment=$2, decided_by_role=$3, decision_date=NOW()
        WHERE approval_id=$4
      `, [user.userId, body.reason, user.role, approvalId]);

      // Mark route as declined so admin sees the declined state and can re-plan/resubmit.
      await pool.query(
        `UPDATE delivery_routes SET status='declined' WHERE route_id=$1 AND business_id=$2`,
        [approval.delivery_id, user.businessId]
      );

      // Release reserved inventory back to available so admin can re-plan freely
      try {
        const DeliveryService = require('./delivery.service');
        await DeliveryService._releaseRouteReservations(approval.delivery_id, user.businessId);
      } catch (reservationError) {
        console.error('[LogisticsService.declineRoute][reservations]', reservationError.message);
      }

      return this._ok({ message: 'Route declined. Admin has been notified.' });
    } catch (e) {
      console.error('[LogisticsService.declineRoute]', e);
      return this._fail(e.message);
    }
  },

  // ── Driver monitor (active drivers) ─────────────────────
  async getDriverMonitor(user) {
    try {
      const { rows } = await pool.query(`
        SELECT
          u.user_id, u.full_name, u.email,
          dr.route_id, dr.route_name, dr.status AS route_status,
          dr.vehicle_type,
          (SELECT COUNT(*) FROM route_stops rs
           WHERE rs.route_id = dr.route_id
             AND rs.actual_departure_time IS NOT NULL) AS stops_completed,
          (SELECT COUNT(*) FROM route_stops rs2
           WHERE rs2.route_id = dr.route_id) AS stops_total
        FROM users u
        LEFT JOIN delivery_routes dr
          ON dr.driver_user_id = u.user_id
          AND dr.status IN ('approved','assigned_to_driver','in_transit')
        WHERE u.business_id = $1 AND u.role = 'driver' AND u.is_active = TRUE
        ORDER BY u.full_name
      `, [user.businessId]);
      return this._ok(rows);
    } catch (e) {
      console.error('[LogisticsService.getDriverMonitor]', e);
      return this._fail(e.message);
    }
  },

  // ── Stats ────────────────────────────────────────────────
  async getStats(user) {
    try {
      const { rows: [s] } = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE ma.status='pending')  AS pending_count,
          COUNT(*) FILTER (WHERE ma.status='approved') AS approved_count,
          COUNT(*) FILTER (WHERE ma.status='rejected') AS declined_count,
          ROUND(AVG(ro.savings_co2)::numeric, 2)       AS avg_co2_saved,
          ROUND(AVG(ro.savings_fuel)::numeric, 2)      AS avg_fuel_saved
        FROM manager_approvals ma
        LEFT JOIN route_optimizations ro ON ro.route_id = ma.delivery_id
        WHERE ma.business_id=$1 AND ma.approval_type='route_optimization'
      `, [user.businessId]);
      return this._ok(s);
    } catch (e) {
      console.error('[LogisticsService.getStats]', e);
      return this._fail(e.message);
    }
  },
};

module.exports = LogisticsService;