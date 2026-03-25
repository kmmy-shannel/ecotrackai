// ============================================================
// FILE: src/controllers/approval.controller.js
//
// Fix #4 changes:
//   approveRouteOptimization() — after setting route to 'approved',
//     call DeliveryService._confirmRouteReservations() so the
//     reserved stock is permanently deducted from inventory.
//
//   declineRouteOptimization() — after setting route to 'declined',
//     call DeliveryService._releaseRouteReservations() so the
//     reservation is lifted and the stock goes back to available.
//
// Everything else is completely unchanged.
// ============================================================
const ApprovalService  = require('../services/approval.service');
const DeliveryService  = require('../services/delivery.service');
const { sendSuccess, sendError } = require('../utils/response.utils');
const pool = require('../config/database');

// GET /api/approvals?status=pending
const getApprovals = async (req, res) => {
  try {
    const result = await ApprovalService.getApprovals(
      req.user,
      req.query.status || 'pending',
      req.query.role   || null
    );
    sendSuccess(res, 200, 'Approvals retrieved', result);
  } catch (error) {
    console.error('Get approvals error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to get approvals');
  }
};

// GET /api/approvals/pending-count
const getPendingCount = async (req, res) => {
  try {
    const result = await ApprovalService.getPendingCount(
      req.user,
      req.query.role || null
    );
    sendSuccess(res, 200, 'Pending count retrieved', result);
  } catch (error) {
    console.error('Get pending count error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to get count');
  }
};

// GET /api/approvals/sustainability
const getSustainabilityApprovals = async (req, res) => {
  try {
    const result = await ApprovalService.getApprovals(
      req.user,
      'pending',
      'sustainability_manager'
    );

    if (!result.success) {
      return sendError(res, 400, result.error);
    }

    return sendSuccess(res, 200, 'Sustainability approvals fetched', {
      approvals: result.data?.approvals || [],
    });
  } catch (error) {
    console.error('Get sustainability approvals error:', error);
    return sendError(res, 500, 'Failed to fetch sustainability approvals');
  }
};

// GET /api/approvals/history?limit=50
const getApprovalHistory = async (req, res) => {
  try {
    const result = await ApprovalService.getApprovalHistory(
      req.user,
      req.query.limit || 50,
      req.query.role  || null
    );
    sendSuccess(res, 200, 'Approval history retrieved', result);
  } catch (error) {
    console.error('Get approval history error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to get approval history');
  }
};

// PUT /api/approvals/:approvalId/approve
const approveItem = async (req, res) => {
  try {
    await ApprovalService.approveItem(
      req.user,
      req.params.approvalId,
      req.body.notes
    );
    sendSuccess(res, 200, 'Item approved successfully');
  } catch (error) {
    console.error('Approve error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to approve item');
  }
};

// PUT /api/approvals/:approvalId/reject
const rejectItem = async (req, res) => {
  try {
    await ApprovalService.rejectItem(
      req.user,
      req.params.approvalId,
      req.body.notes
    );
    sendSuccess(res, 200, 'Item rejected');
  } catch (error) {
    console.error('Reject error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to reject item');
  }
};

// POST /api/approvals/from-alert
const createFromAlert = async (req, res) => {
  try {
    console.log('[createFromAlert] req.user:', req.user);
    console.log('[createFromAlert] req.body:', req.body);
    const result = await ApprovalService.createFromAlert(req.user, req.body);
    sendSuccess(res, 201, 'Approval request created', result);
  } catch (error) {
    console.error('[createFromAlert] FULL ERROR:', error);
    sendError(res, error.status || 500, error.message || 'Failed to create approval');
  }
};

// POST /api/approvals/:approvalId/request-admin
const requestAdminReview = async (req, res) => {
  try {
    const result = await ApprovalService.requestAdminReview(
      req.user,
      req.params.approvalId,
      req.body.manager_comment || ''
    );
    sendSuccess(res, 200, result.message);
  } catch (error) {
    console.error('Request admin review error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to escalate to admin');
  }
};

// GET /api/approvals/admin-requests
const getAdminRequests = async (req, res) => {
  try {
    const result = await ApprovalService.getAdminRequests(req.user);
    sendSuccess(res, 200, 'Admin requests retrieved', result);
  } catch (error) {
    console.error('Get admin requests error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to get admin requests');
  }
};

// PUT /api/approvals/:approvalId/admin-review
const adminReviewRequest = async (req, res) => {
  try {
    const result = await ApprovalService.adminReviewRequest(
      req.user,
      req.params.approvalId,
      req.body.decision,
      req.body.admin_comment || ''
    );
    sendSuccess(res, 200, result.message);
  } catch (error) {
    console.error('Admin review error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to submit admin review');
  }
};

const createFromDelivery = async (req, res) => {
  try {
    const result = await ApprovalService.createFromDelivery(req.user, req.body);
    sendSuccess(res, 201, 'Route approval request created', result);
  } catch (error) {
    console.error('Create from delivery error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to create route approval');
  }
};

// GET /api/route-approvals  — list pending route approvals for the LM
const getRouteApprovals = async (req, res) => {
  try {
    const { businessId, role } = req.user;
    if (role !== 'logistics_manager') return sendError(res, 403, 'Access denied');

    const { rows } = await pool.query(`
      SELECT
        ma.*,
        dr.route_name,
        dr.status                             AS route_status,
        dr.total_distance_km,
        dr.estimated_duration_minutes,
        dr.estimated_fuel_consumption_liters,
        dr.estimated_carbon_kg,
        dr.vehicle_type,
        dr.origin_location,
        dr.destination_location,
        submitter.full_name                   AS submitted_by_name,
        submitter.email                       AS submitted_by_email,
        driver.full_name                      AS driver_name,
        ro.savings_km,
        ro.savings_fuel,
        ro.savings_co2,
        ro.ai_recommendation,
        ro.optimized_distance,
        ro.optimized_duration
      FROM manager_approvals ma
      LEFT JOIN delivery_routes     dr        ON dr.route_id      = ma.delivery_id
      LEFT JOIN users               submitter ON submitter.user_id = ma.submitted_by
      LEFT JOIN users               driver    ON driver.user_id    = dr.driver_user_id
      LEFT JOIN route_optimizations ro        ON ro.route_id       = ma.delivery_id
      WHERE ma.business_id    = $1
        AND ma.required_role  = 'logistics_manager'
        AND ma.approval_type  = 'route_optimization'
        AND ma.status         = 'pending'
      ORDER BY ma.created_at DESC
    `, [businessId]);

    sendSuccess(res, 200, 'Route approvals fetched', rows);
  } catch (error) {
    console.error('[getRouteApprovals]', error.message);
    sendError(res, 500, 'Failed to fetch route approvals');
  }
};

// PUT /api/route-approvals/:id/approve  — LM approves the route
// Fix #4: after route is set to 'approved', confirm (permanently deduct)
// the reserved inventory quantities for this route.
const approveRouteOptimization = async (req, res) => {
  try {
    const { businessId, role } = req.user;
    if (role !== 'logistics_manager') return sendError(res, 403, 'Access denied');

    const { id }     = req.params;
    const { notes = '' } = req.body;

    const { rows } = await pool.query(
      `SELECT * FROM manager_approvals WHERE approval_id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!rows[0])               return sendError(res, 404, 'Approval not found');
    if (rows[0].status !== 'pending')
      return sendError(res, 400, `Approval already ${rows[0].status}`);

    await pool.query(
      `UPDATE manager_approvals SET status = 'approved', review_notes = $2 WHERE approval_id = $1`,
      [id, notes]
    );

    // Route → approved so driver can start
    if (rows[0].delivery_id) {
      console.log('[approveRouteOptimization] updating route_id:', rows[0].delivery_id, 'business_id:', businessId);
      const deliveryUpdate = await pool.query(
        `UPDATE delivery_routes SET status = 'approved', updated_at = NOW()
         WHERE route_id = $1 AND business_id = $2`,
        [rows[0].delivery_id, businessId]
      );
      console.log('[approveRouteOptimization] delivery_routes rowCount:', deliveryUpdate.rowCount);

      // If no row was updated, try without business_id filter as fallback
      if (deliveryUpdate.rowCount === 0) {
        console.warn('[approveRouteOptimization] business_id filter matched 0 rows — retrying without business_id');
        await pool.query(
          `UPDATE delivery_routes SET status = 'approved', updated_at = NOW()
           WHERE route_id = $1`,
          [rows[0].delivery_id]
        );
      }

      // Fix #4: permanently deduct the reserved stock from inventory
      // Non-fatal: if delivery_items is missing we log and continue
      try {
        await DeliveryService._confirmRouteReservations(rows[0].delivery_id, businessId);
        console.log(`[approveRouteOptimization] reservations confirmed for route ${rows[0].delivery_id}`);
      } catch (reservationErr) {
        console.error('[approveRouteOptimization] reservation confirmation failed (non-fatal):', reservationErr.message);
      }
    }

    sendSuccess(res, 200, 'Route approved — driver has been notified');
  } catch (error) {
    console.error('[approveRouteOptimization]', error.message);
    sendError(res, 500, 'Failed to approve route');
  }
};

// PUT /api/route-approvals/:id/decline  — LM declines the route
// Fix #4: after route is set to 'declined', release the reserved
// inventory quantities so stock goes back to available.
const declineRouteOptimization = async (req, res) => {
  try {
    const { businessId, role } = req.user;
    if (role !== 'logistics_manager') return sendError(res, 403, 'Access denied');

    const { id }         = req.params;
    const { reason = '' } = req.body;

    if (!reason.trim()) return sendError(res, 400, 'A reason is required when declining');

    const { rows } = await pool.query(
      `SELECT * FROM manager_approvals WHERE approval_id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!rows[0])               return sendError(res, 404, 'Approval not found');
    if (rows[0].status !== 'pending')
      return sendError(res, 400, `Approval already ${rows[0].status}`);

    await pool.query(
      `UPDATE manager_approvals
       SET status = 'declined', review_notes = $2, updated_at = NOW()
       WHERE approval_id = $1`,
      [id, reason]
    );

    // Route → 'declined' — admin sees it in Declined filter
    if (rows[0].delivery_id) {
      console.log('[declineRouteOptimization] updating route_id:', rows[0].delivery_id, 'business_id:', businessId);
      const deliveryDeclineUpdate = await pool.query(
        `UPDATE delivery_routes SET status = 'declined', updated_at = NOW()
         WHERE route_id = $1 AND business_id = $2`,
        [rows[0].delivery_id, businessId]
      );
      console.log('[declineRouteOptimization] delivery_routes rowCount:', deliveryDeclineUpdate.rowCount);

      if (deliveryDeclineUpdate.rowCount === 0) {
        console.warn('[declineRouteOptimization] business_id filter matched 0 rows — retrying without business_id');
        await pool.query(
          `UPDATE delivery_routes SET status = 'declined', updated_at = NOW()
           WHERE route_id = $1`,
          [rows[0].delivery_id]
        );
      }
      // Fix #4: release reserved inventory so stock goes back to available
      try {
        await DeliveryService._releaseRouteReservations(rows[0].delivery_id, businessId);
        console.log(`[declineRouteOptimization] reservations released for route ${rows[0].delivery_id}`);
      } catch (reservationErr) {
        console.error('[declineRouteOptimization] reservation release failed (non-fatal):', reservationErr.message);
      }
    }

    sendSuccess(res, 200, 'Route declined — admin has been notified');
  } catch (error) {
    console.error('[declineRouteOptimization]', error.message);
    sendError(res, 500, 'Failed to decline route');
  }
};

// GET /api/route-approvals/stats  — LM dashboard stats
const getRouteApprovalStats = async (req, res) => {
  try {
    const { businessId, role } = req.user;
    if (role !== 'logistics_manager') return sendError(res, 403, 'Access denied');

    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE ma.status = 'pending')  AS pending_count,
        COUNT(*) FILTER (WHERE ma.status = 'approved') AS approved_count,
        COUNT(*) FILTER (WHERE ma.status = 'declined') AS declined_count,
        AVG(ro.savings_co2) FILTER (WHERE ma.status = 'approved') AS avg_co2_saved
      FROM manager_approvals ma
      LEFT JOIN route_optimizations ro ON ro.route_id = ma.delivery_id
      WHERE ma.business_id   = $1
        AND ma.required_role = 'logistics_manager'
        AND ma.approval_type = 'route_optimization'
    `, [businessId]);

    sendSuccess(res, 200, 'Stats fetched', rows[0]);
  } catch (error) {
    console.error('[getRouteApprovalStats]', error.message);
    sendError(res, 500, 'Failed to fetch stats');
  }
};

module.exports = {
  getApprovals,
  getPendingCount,
  getApprovalHistory,
  approveItem,
  rejectItem,
  createFromAlert,
  requestAdminReview,
  getAdminRequests,
  adminReviewRequest,
  createFromDelivery,
  getRouteApprovals,
  approveRouteOptimization,
  declineRouteOptimization,
  getRouteApprovalStats,
  getSustainabilityApprovals,
};