// ============================================================
// FILE: ecotrackai-backend/src/controllers/ecotrust.controller.js
// ============================================================
const pool = require('../config/database');
const EcoTrustService = require('../services/ecotrust.service');

// ─── helpers ──────────────────────────────────────────────────────────────────
const ok  = (res, data, message = 'Success') =>
  res.status(200).json({ success: true, message, data });

const err = (res, message = 'Server error', status = 500) =>
  res.status(status).json({ success: false, message });

// ─── GET /api/ecotrust/score ──────────────────────────────────────────────────
// Reads businessId from JWT (supports both camelCase and snake_case from auth middleware)
const getScore = async (req, res) => {
  try {
    const businessId =
      req.user?.businessId ||
      req.user?.business_id ||
      req.query?.business_id ||
      req.query?.businessId;

    if (!businessId) {
      return err(res, 'Business ID is required', 400);
    }

    // Use the service's recalculateBusinessScore which handles everything
    const context = {
      userId:     req.user?.userId || req.user?.user_id || null,
      businessId: businessId,
      role:       req.user?.role || 'admin',
    };

    const scoreResult = await EcoTrustService.recalculateBusinessScore(context);
    if (!scoreResult.success) {
      return err(res, scoreResult.error, 500);
    }

    const scoreRow = scoreResult.data || {};

    // Fetch recent transactions for this business
    let transactions = [];
    try {
      const txQuery = `
        SELECT
          t.transaction_id,
          t.points_earned,
          t.action_type,
          t.related_record_type,
          t.transaction_date,
          t.verification_status,
          t.notes,
          COALESCE(sa.action_category, t.action_type) AS category
        FROM ecotrust_transactions t
        LEFT JOIN sustainable_actions sa ON sa.action_id = t.action_id
        WHERE t.business_id = $1
        ORDER BY t.created_at DESC
        LIMIT 20
      `;
      const txResult = await pool.query(txQuery, [businessId]);
      transactions = txResult.rows || [];
    } catch (txErr) {
      // transactions table may be empty — not fatal
      console.warn('[ecotrust.controller] Could not load transactions:', txErr.message);
    }

    // Fetch sustainable_actions list for "How to Earn" section
    let actions = [];
    try {
      const actQuery = `
        SELECT
          action_id,
          action_name,
          action_category  AS category,
          points_value,
          description,
          verification_required
        FROM sustainable_actions
        ORDER BY points_value DESC
      `;
      const actResult = await pool.query(actQuery);
      actions = actResult.rows || [];
    } catch (actErr) {
      // not fatal — frontend has a static fallback
      console.warn('[ecotrust.controller] Could not load sustainable_actions:', actErr.message);
    }

    return ok(res, {
      current_score: Number(scoreRow.score)  || 0,
      total_points:  Number(scoreRow.score)  || 0,
      level:         scoreRow.level          || 'Newcomer',
      rank:          scoreRow.rank           || null,
      transactions,
      actions,
    });
  } catch (e) {
    console.error('[ecotrust.controller.getScore]', e);
    return err(res, 'Failed to load EcoTrust score', 500);
  }
};

// ─── GET /api/ecotrust/actions ────────────────────────────────────────────────
const getSustainableActions = async (req, res) => {
  try {
    let actions = [];
    try {
      const { rows } = await pool.query(`
        SELECT
          action_id,
          action_name,
          action_category AS category,
          points_value,
          description,
          verification_required
        FROM sustainable_actions
        ORDER BY points_value DESC
      `);
      actions = rows;
    } catch (dbErr) {
      console.warn('[ecotrust.controller] sustainable_actions query failed:', dbErr.message);
      // return static defaults so the frontend still works
      actions = [
        { action_name: 'Spoilage Alert Approved',     category: 'spoilage prevention',   points_value: 25 },
        { action_name: 'Route Optimization Approved', category: 'delivery optimization',  points_value: 30 },
        { action_name: 'Carbon Record Verified',      category: 'carbon verification',    points_value: 20 },
        { action_name: 'Delivery Completed On Time',  category: 'delivery completion',    points_value: 10 },
      ];
    }
    return ok(res, actions);
  } catch (e) {
    console.error('[ecotrust.controller.getSustainableActions]', e);
    return err(res, 'Failed to load sustainable actions', 500);
  }
};

// ─── GET /api/ecotrust/leaderboard ───────────────────────────────────────────
const getLeaderboard = async (req, res) => {
  try {
    const context = {
      userId:     req.user?.userId     || req.user?.user_id  || null,
      businessId: req.user?.businessId || req.user?.business_id || null,
      role:       req.user?.role       || 'admin',
    };
    const limit  = parseInt(req.query?.limit, 10) || 50;
    const result = await EcoTrustService.getLeaderboard(context, limit);
    result.success
      ? ok(res, result.data)
      : err(res, result.error, 403);
  } catch (e) {
    console.error('[ecotrust.controller.getLeaderboard]', e);
    return err(res, 'Failed to load leaderboard', 500);
  }
};

module.exports = { getScore, getSustainableActions, getLeaderboard };