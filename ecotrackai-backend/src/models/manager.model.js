// ============================================================
// FILE: src/models/manager.model.js
// Adds logistics-specific queries alongside existing ones
// ============================================================
const pool = require('../config/database');

const ManagerModel = {

  // ── LOGISTICS: Pending route approvals ──────────────────
  async getLogisticsPending(businessId) {
    const result = await pool.query(`
      SELECT
        ma.*,
        u.full_name  AS submitted_by_name,
        rv.full_name AS reviewed_by_name,
        ro.optimized_distance_km  AS optimized_distance,
        ro.optimized_fuel_liters  AS optimized_fuel,
        ro.optimized_carbon_kg,
        ro.savings_km,
        ro.savings_fuel,
        ro.savings_co2,
        ro.ai_recommendation,
        dr.total_distance_km,
        dr.estimated_fuel_consumption_liters,
        dr.estimated_carbon_kg,
        dr.vehicle_type,
        dr.driver_name,
        dr.driver_user_id,
        dv.full_name AS driver_full_name
      FROM manager_approvals ma
      LEFT JOIN users u  ON ma.submitted_by = u.user_id
      LEFT JOIN users rv ON ma.reviewed_by  = rv.user_id
      LEFT JOIN delivery_routes dr     ON ma.delivery_id = dr.route_id
      LEFT JOIN route_optimizations ro ON ma.delivery_id = ro.route_id
      LEFT JOIN users dv ON dr.driver_user_id = dv.user_id
      WHERE ma.business_id    = $1
        AND ma.approval_type  = 'route_optimization'
        AND ma.status         = 'pending'
      ORDER BY ma.created_at DESC
    `, [businessId]);
    return { success: true, data: result.rows };
  },

  // ── LOGISTICS: History ───────────────────────────────────
  async getLogisticsHistory(businessId) {
    const result = await pool.query(`
      SELECT
        ma.*,
        u.full_name  AS submitted_by_name,
        rv.full_name AS reviewed_by_name,
        dr.vehicle_type, dr.driver_name,
        dl.actual_carbon_kg
      FROM manager_approvals ma
      LEFT JOIN users u  ON ma.submitted_by = u.user_id
      LEFT JOIN users rv ON ma.reviewed_by  = rv.user_id
      LEFT JOIN delivery_routes dr  ON ma.delivery_id = dr.route_id
      LEFT JOIN delivery_logs dl    ON dl.route_id    = ma.delivery_id
      WHERE ma.business_id    = $1
        AND ma.approval_type  = 'route_optimization'
        AND ma.status        != 'pending'
      ORDER BY ma.created_at DESC
    `, [businessId]);
    return { success: true, data: result.rows };
  },

  // ── LOGISTICS: Stats ─────────────────────────────────────
  async getLogisticsStats(businessId) {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='pending')  AS pending_count,
        COUNT(*) FILTER (WHERE status='approved') AS approved_count,
        COUNT(*) FILTER (WHERE status IN ('rejected','declined')) AS declined_count,
        ROUND(AVG(savings_co2)::numeric, 2) AS avg_co2_saved
      FROM manager_approvals
      WHERE business_id = $1 AND approval_type = 'route_optimization'
    `, [businessId]);
    return { success: true, data: result.rows[0] };
  },

  // ── LOGISTICS: Approve ───────────────────────────────────
  async approveLogistics(approvalId, businessId, reviewerId, comment) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update approval record
      const approval = await client.query(`
        UPDATE manager_approvals
        SET status       = 'approved',
            reviewed_by  = $1,
            reviewed_at  = NOW(),
            review_notes = $2,
            decided_by_role = 'logistics_manager',
            decision     = 'approved',
            decision_date = NOW()
        WHERE approval_id = $3 AND business_id = $4
        RETURNING delivery_id
      `, [reviewerId, comment || null, approvalId, businessId]);

      if (approval.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Approval not found' };
      }

      const deliveryId = approval.rows[0].delivery_id;

      // Update route status to approved
      if (deliveryId) {
        await client.query(`
          UPDATE delivery_routes
          SET status = 'approved', updated_at = NOW()
          WHERE route_id = $1 AND business_id = $2
        `, [deliveryId, businessId]);

        // Apply optimization if it exists
        await client.query(`
          UPDATE route_optimizations
          SET status = 'approved'
          WHERE route_id = $1
        `, [deliveryId]);

        // Award EcoTrust points for route optimization approved
        await client.query(`
          INSERT INTO ecotrust_transactions (
            business_id, action_id, action_type,
            points_earned, related_record_type, related_record_id,
            verification_status, transaction_date, created_at
          )
          SELECT $1, action_id, 'Route Optimization Approved', points_value,
                 'delivery', $2, 'pending', CURRENT_DATE, NOW()
          FROM sustainable_actions
          WHERE action_name = 'Route Optimization Approved'
          LIMIT 1
        `, [businessId, deliveryId]);
      }

      await client.query('COMMIT');
      return { success: true, data: { message: 'Route approved. Driver has been notified.' } };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[approveLogistics]', err);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  },

  // ── LOGISTICS: Decline ───────────────────────────────────
  async declineLogistics(approvalId, businessId, reviewerId, comment) {
    if (!comment || !comment.trim())
      return { success: false, error: 'A reason is required to decline' };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const approval = await client.query(`
        UPDATE manager_approvals
        SET status          = 'rejected',
            reviewed_by     = $1,
            reviewed_at     = NOW(),
            review_notes    = $2,
            manager_comment = $2,
            decided_by_role = 'logistics_manager',
            decision        = 'rejected',
            decision_date   = NOW()
        WHERE approval_id = $3 AND business_id = $4
        RETURNING delivery_id
      `, [reviewerId, comment, approvalId, businessId]);

      if (approval.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Approval not found' };
      }

      const deliveryId = approval.rows[0].delivery_id;

      // Return route to planned status so admin can edit and resubmit
      if (deliveryId) {
        await client.query(`
          UPDATE delivery_routes
          SET status = 'planned', updated_at = NOW()
          WHERE route_id = $1 AND business_id = $2
        `, [deliveryId, businessId]);
      }

      await client.query('COMMIT');
      return { success: true, data: { message: 'Route declined. Admin has been notified.' } };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[declineLogistics]', err);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  },

  // ── INVENTORY: Pending spoilage approvals ────────────────
  async getInventoryPending(businessId) {
    const result = await pool.query(`
      SELECT
        ma.*,
        u.full_name AS submitted_by_name,
        rv.full_name AS reviewed_by_name
      FROM manager_approvals ma
      LEFT JOIN users u  ON ma.submitted_by = u.user_id
      LEFT JOIN users rv ON ma.reviewed_by  = rv.user_id
      WHERE ma.business_id    = $1
        AND ma.approval_type  = 'spoilage_action'
        AND ma.status         = 'pending'
      ORDER BY ma.created_at DESC
    `, [businessId]);
    return { success: true, data: result.rows };
  },

  // ── INVENTORY: History ───────────────────────────────────
  async getInventoryHistory(businessId) {
    const result = await pool.query(`
      SELECT
        ma.*,
        u.full_name  AS submitted_by_name,
        rv.full_name AS reviewed_by_name
      FROM manager_approvals ma
      LEFT JOIN users u  ON ma.submitted_by = u.user_id
      LEFT JOIN users rv ON ma.reviewed_by  = rv.user_id
      WHERE ma.business_id    = $1
        AND ma.approval_type  = 'spoilage_action'
        AND ma.status        != 'pending'
      ORDER BY ma.created_at DESC
    `, [businessId]);
    return { success: true, data: result.rows };
  },

  // ── INVENTORY: Approve ───────────────────────────────────
  async approveInventory(approvalId, businessId, reviewerId, comment) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const approval = await client.query(`
        UPDATE manager_approvals
        SET status       = 'approved',
            reviewed_by  = $1,
            reviewed_at  = NOW(),
            review_notes = $2,
            decided_by_role = 'inventory_manager',
            decision     = 'approved',
            decision_date = NOW()
        WHERE approval_id = $3 AND business_id = $4
        RETURNING alert_id
      `, [reviewerId, comment || null, approvalId, businessId]);

      if (approval.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Approval not found' };
      }

      const alertId = approval.rows[0].alert_id;

      if (alertId) {
        await client.query(
          `UPDATE alerts SET status='approved', updated_at=NOW() WHERE id=$1`,
          [alertId]
        );

        await client.query(`
          INSERT INTO ecotrust_transactions (
            business_id, action_id, action_type,
            points_earned, related_record_type, related_record_id,
            verification_status, transaction_date, created_at
          )
          SELECT $1, action_id, 'Spoilage Alert Approved', points_value,
                 'alert', $2, 'pending', CURRENT_DATE, NOW()
          FROM sustainable_actions
          WHERE action_name = 'Spoilage Alert Approved'
          LIMIT 1
        `, [businessId, alertId]);
      }

      await client.query('COMMIT');
      return { success: true, data: { message: 'Spoilage action approved.' } };
    } catch (err) {
      await client.query('ROLLBACK');
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  },

  // ── INVENTORY: Decline ───────────────────────────────────
  async declineInventory(approvalId, businessId, reviewerId, comment) {
    if (!comment || !comment.trim())
      return { success: false, error: 'A reason is required to decline' };

    const approval = await pool.query(`
      UPDATE manager_approvals
      SET status          = 'rejected',
          reviewed_by     = $1,
          reviewed_at     = NOW(),
          review_notes    = $2,
          manager_comment = $2,
          decided_by_role = 'inventory_manager',
          decision        = 'rejected',
          decision_date   = NOW()
      WHERE approval_id = $3 AND business_id = $4
      RETURNING alert_id
    `, [reviewerId, comment, approvalId, businessId]);

    if (approval.rows.length === 0)
      return { success: false, error: 'Approval not found' };

    const alertId = approval.rows[0].alert_id;
    if (alertId) {
      await pool.query(
        `UPDATE alerts SET status='active', updated_at=NOW() WHERE id=$1`,
        [alertId]
      );
    }

    return { success: true, data: { message: 'Declined. Admin has been notified.' } };
  },

};

module.exports = ManagerModel;