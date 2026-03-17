// ============================================================
// FILE: src/models/manager.model.js
// Adds logistics-specific queries alongside existing ones
// ============================================================
const pool = require('../config/database');
const DeliveryService = require('../services/delivery.service');
const ApprovalModel   = require('./approval.model');

const MANAGED_ROLES = [
  'inventory_manager',
  'logistics_manager',
  'sustainability_manager',
  'driver'
];

const ManagerModel = {
  async findAllByBusiness(businessId) {
    const result = await pool.query(`
      SELECT
        user_id,
        username,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE business_id = $1
        AND role = ANY($2::text[])
      ORDER BY created_at DESC
    `, [businessId, MANAGED_ROLES]);

    return result.rows;
  },

  async findByEmailOrUsername(email, username) {
    const result = await pool.query(`
      SELECT user_id
      FROM users
      WHERE email = $1 OR username = $2
      LIMIT 1
    `, [email, username]);

    return result.rows[0] || null;
  },

  async create(businessId, username, email, hashedPassword, fullName, role) {
    const result = await pool.query(`
      INSERT INTO users (
        business_id,
        username,
        email,
        password_hash,
        full_name,
        role
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        user_id,
        username,
        email,
        full_name,
        role,
        is_active,
        created_at
    `, [businessId, username, email, hashedPassword, fullName, role]);

    return result.rows[0] || null;
  },

  async findNonAdminByIdAndBusiness(managerId, businessId) {
    const result = await pool.query(`
      SELECT
        user_id,
        username,
        email,
        full_name,
        role,
        is_active
      FROM users
      WHERE user_id = $1
        AND business_id = $2
        AND role = ANY($3::text[])
      LIMIT 1
    `, [managerId, businessId, MANAGED_ROLES]);

    return result.rows[0] || null;
  },

  async update(managerId, changes = {}) {
    const updates = [];
    const values = [];

    if (changes.fullName !== undefined) {
      values.push(changes.fullName);
      updates.push(`full_name = $${values.length}`);
    }

    if (changes.email !== undefined) {
      values.push(changes.email);
      updates.push(`email = $${values.length}`);
    }

    if (changes.username !== undefined) {
      values.push(changes.username);
      updates.push(`username = $${values.length}`);
    }

    if (changes.isActive !== undefined) {
      values.push(changes.isActive);
      updates.push(`is_active = $${values.length}`);
    }

    if (updates.length === 0) return null;

    values.push(managerId);

    const result = await pool.query(`
      UPDATE users
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $${values.length}
      RETURNING
        user_id,
        username,
        email,
        full_name,
        role,
        is_active,
        updated_at
    `, values);

    return result.rows[0] || null;
  },

  async findByIdAndBusiness(managerId, businessId) {
    const result = await pool.query(`
      SELECT
        user_id,
        business_id,
        username,
        email,
        full_name,
        role,
        is_active
      FROM users
      WHERE user_id = $1 AND business_id = $2
      LIMIT 1
    `, [managerId, businessId]);

    return result.rows[0] || null;
  },

  // ── Fix #1: deactivate sets is_active = FALSE and stamps updated_at ─────────
  // We keep this as a "soft delete" to preserve audit trail integrity.
  // Hard deletion is intentionally avoided because:
  //   - manager_approvals.reviewed_by references this user_id
  //   - ecotrust_transactions.verified_by references this user_id
  //   - approval_history.user_id references this user_id
  // Deleting the row would orphan those FK references.
  async deactivate(managerId) {
    const result = await pool.query(`
      UPDATE users
      SET is_active = FALSE, updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id, full_name, email, role
    `, [managerId]);

    return result.rows[0] || null;
  },

  // ── Fix #1: clear active sessions so deactivated user is logged out ──────────
  async deleteSessions(managerId) {
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [managerId]);
    return true;
  },

  async updatePassword(managerId, hashedPassword) {
    const result = await pool.query(`
      UPDATE users
      SET
        password_hash = $1,
        reset_password_token = NULL,
        reset_password_expires = NULL,
        updated_at = NOW()
      WHERE user_id = $2
      RETURNING user_id
    `, [hashedPassword, managerId]);

    return result.rows[0] || null;
  },


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

        // Deduct any reserved inventory now that the route is approved
        try {
          await DeliveryService._confirmRouteReservations(deliveryId, businessId);
        } catch (err) {
          console.error('[approveLogistics] confirm reservations failed:', err.message);
        }
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

        // Release any reserved inventory back to available
        try {
          await DeliveryService._releaseRouteReservations(deliveryId, businessId);
        } catch (err) {
          console.error('[declineLogistics] release reservations failed:', err.message);
        }
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

        // ── Risk check: only HIGH risk alerts earn points ──
        const { rows: alertRows } = await client.query(
          `SELECT risk_level, days_left, batch_number
             FROM alerts WHERE id = $1 AND business_id = $2 LIMIT 1`,
          [alertId, businessId]
        );
        const alertRisk = (alertRows[0]?.risk_level || '').toUpperCase();
        const alertDays = Number(alertRows[0]?.days_left ?? 99);

        let computedRisk = alertRisk;
        if (!computedRisk || computedRisk === '') {
          const batch = alertRows[0]?.batch_number || null;
          if (batch) {
            const { rows: invRows } = await client.query(
              `SELECT
                 CASE
                   WHEN (expected_expiry_date - CURRENT_DATE)::int <= 4 THEN 'HIGH'
                   WHEN (expected_expiry_date - CURRENT_DATE)::int <= 7 THEN 'MEDIUM'
                   ELSE 'LOW'
                 END AS risk_level
               FROM inventory
               WHERE batch_number = $1 AND business_id = $2
               LIMIT 1`,
              [batch, businessId]
            );
            computedRisk = (invRows[0]?.risk_level || '').toUpperCase();
          }
        }

        const isHighRisk =
          alertRisk === 'HIGH' ||
          computedRisk === 'HIGH' ||
          alertDays <= 4;

        if (isHighRisk) {
          try {
            const txResult = await ApprovalModel.createEcoTrustTransaction({
              businessId,
              actionType: 'spoilage_action',
              relatedRecordType: 'alert',
              relatedRecordId: alertId,
              verificationStatus: 'verified',
              actorUserId: reviewerId,
              source: 'inventory_manager_approval'
            });
            if (!txResult.success) {
              console.warn('[ManagerModel.approveInventory][ecotrust] failed:', txResult.error);
            }
          } catch (ecoErr) {
            console.warn('[ManagerModel.approveInventory][ecotrust] exception:', ecoErr.message);
          }
        }
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
