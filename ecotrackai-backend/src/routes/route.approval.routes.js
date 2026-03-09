// ============================================================
// FILE: src/routes/route.approval.routes.js
// Logistics Manager route approval endpoints
// ============================================================
const express = require('express');
const router  = express.Router();
const pool = require('../config/database');
// FIXED: Changed from '../middleware/auth' to '../middleware/auth.middleware'
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { sendSuccess, sendError } = require('../utils/response.utils');

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
const approveRouteOptimization = async (req, res) => {
  try {
    const { businessId, role } = req.user;
    if (role !== 'logistics_manager') return sendError(res, 403, 'Access denied');

    const { id } = req.params;
    const { notes = '' } = req.body;

    const { rows } = await pool.query(
      `SELECT * FROM manager_approvals WHERE approval_id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!rows[0])             return sendError(res, 404, 'Approval not found');
    if (rows[0].status !== 'pending')
      return sendError(res, 400, `Approval already ${rows[0].status}`);

    await pool.query(
      `UPDATE manager_approvals SET status = 'approved', review_notes = $2, updated_at = NOW() WHERE approval_id = $1`,
      [id, notes]
    );

    // Route → approved so driver can start
    if (rows[0].delivery_id) {
      await pool.query(
        `UPDATE delivery_routes SET status = 'approved', updated_at = NOW()
         WHERE route_id = $1 AND business_id = $2`,
        [rows[0].delivery_id, businessId]
      );
    }

    sendSuccess(res, 200, 'Route approved — driver has been notified');
  } catch (error) {
    console.error('[approveRouteOptimization]', error.message);
    sendError(res, 500, 'Failed to approve route');
  }
};

// PUT /api/route-approvals/:id/decline  — LM declines the route
const declineRouteOptimization = async (req, res) => {
  try {
    const { businessId, role } = req.user;
    if (role !== 'logistics_manager') return sendError(res, 403, 'Access denied');

    const { id } = req.params;
    const { reason = '' } = req.body;

    if (!reason.trim()) return sendError(res, 400, 'A reason is required when declining');

    const { rows } = await pool.query(
      `SELECT * FROM manager_approvals WHERE approval_id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!rows[0])             return sendError(res, 404, 'Approval not found');
    if (rows[0].status !== 'pending')
      return sendError(res, 400, `Approval already ${rows[0].status}`);

    // Save decline reason so admin can read it
    await pool.query(
      `UPDATE manager_approvals
       SET status = 'declined', review_notes = $2, updated_at = NOW()
       WHERE approval_id = $1`,
      [id, reason]
    );

    // Route → 'declined' (not 'planned') — admin sees it in Declined filter
    if (rows[0].delivery_id) {
      await pool.query(
        `UPDATE delivery_routes SET status = 'declined', updated_at = NOW()
         WHERE route_id = $1 AND business_id = $2`,
        [rows[0].delivery_id, businessId]
      );
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

// Register routes
router.get('/', authenticate, authorize('logistics_manager'), getRouteApprovals);
router.get('/stats', authenticate, authorize('logistics_manager'), getRouteApprovalStats);
router.put('/:id/approve', authenticate, authorize('logistics_manager'), approveRouteOptimization);
router.put('/:id/decline', authenticate, authorize('logistics_manager'), declineRouteOptimization);

module.exports = router;