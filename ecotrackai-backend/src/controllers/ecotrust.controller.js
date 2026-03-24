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
      console.warn('[ecotrust.controller] Could not load transactions:', txErr.message);
    }

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
      console.warn('[ecotrust.controller] Could not load sustainable_actions:', actErr.message);
    }

    return ok(res, {
      current_score: Number(scoreRow.current_score ?? scoreRow.score ?? scoreRow.total_points ?? 0),
      total_points:  Number(scoreRow.current_score ?? scoreRow.score ?? scoreRow.total_points ?? 0),
      level:         scoreRow.level || 'Newcomer',
      rank:          scoreRow.rank  || null,
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
      actions = [
        { action_name: 'Spoilage Alert Approved',     category: 'spoilage prevention',   points_value: 25 },
        { action_name: 'Route Optimization Approved', category: 'delivery optimization',  points_value: 30 },
        { action_name: 'carbon_verified',             category: 'carbon verification',    points_value: 20 },
        { action_name: 'Delivery Completed',          category: 'delivery completion',    points_value: 10 },
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

const getTransactionsByBusiness = async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.business_id;
    if (!businessId) return err(res, 'businessId required', 400);

    const role = req.user?.role || 'admin';
    const isSustainabilityManager = role === 'sustainability_manager';

    const { rows } = await pool.query(
      `SELECT
         transaction_id,
         business_id,
         action_type,
         points_earned,
         verification_status,
         related_record_type,
         related_record_id,
         created_at,
         COALESCE(flagged, false) AS flagged,
         flag_reason,
         flagged_by,
         flagged_at
       FROM ecotrust_transactions
       WHERE business_id = $1
         ${isSustainabilityManager ? "AND (action_type = 'carbon_verified' OR related_record_type = 'carbon_record')" : ''}
       ORDER BY created_at DESC`,
      [businessId]
    );

    return ok(res, rows, 'Transactions retrieved');
  } catch (error) {
    console.error('[ecotrust.controller.getTransactionsByBusiness]', error);
    return err(res, 'Failed to retrieve transactions', 500);
  }
};

const flagTransaction = async (req, res) => {
  try {
    const transactionId = req.params?.id;
    const reason        = req.body?.reason;
    const userId        = req.user?.userId || req.user?.user_id;
    const businessId    = req.user?.businessId || req.user?.business_id;
    const role          = req.user?.role || 'admin';

    if (!transactionId) return err(res, 'Transaction ID required', 400);
    if (!reason || reason.trim().length < 3) {
      return err(res, 'A reason must be provided', 400);
    }

    const check = await pool.query(
      `SELECT transaction_id,
              COALESCE(flagged, false) AS flagged,
              action_type,
              related_record_type,
              related_record_id
       FROM ecotrust_transactions
       WHERE transaction_id = $1 AND business_id = $2`,
      [transactionId, businessId]
    );

    if (check.rows.length === 0) return err(res, 'Transaction not found or unauthorized', 404);
    if (check.rows[0].flagged)   return err(res, 'Transaction already flagged', 400);

    if (role === 'sustainability_manager') {
      const t = check.rows[0];
      const isCarbon = t.action_type === 'carbon_verified' || t.related_record_type === 'carbon_record';
      if (!isCarbon) return err(res, 'Sustainability Manager can only flag carbon verification transactions', 403);
    }

    const { rows } = await pool.query(
      `UPDATE ecotrust_transactions
       SET
         flagged     = TRUE,
         flag_reason = $1,
         flagged_by  = $2,
         flagged_at  = NOW()
       WHERE transaction_id = $3 AND business_id = $4
       RETURNING transaction_id, flagged, flag_reason, flagged_at`,
      [reason.trim(), userId, transactionId, businessId]
    );

    try {
      const txRow = check.rows[0];
      const reasonText = reason.trim();
      const carbonId   = txRow.related_record_id;
      const relatedIsCarbon = txRow.related_record_type === 'carbon_record';

      if (carbonId) {
        const result = await pool.query(
          `UPDATE carbon_footprint_records
             SET verification_status = 'revision_requested',
                 revision_notes      = $1,
                 updated_at          = NOW()
           WHERE record_id = $2 AND business_id = $3
           RETURNING record_id`,
          [reasonText, carbonId, businessId]
        );
        if (result.rowCount === 0) {
          await pool.query(
            `UPDATE carbon_footprint_records
               SET verification_status = 'revision_requested',
                   revision_notes      = $1,
                   updated_at          = NOW()
             WHERE route_id = $2 AND business_id = $3`,
            [reasonText, carbonId, businessId]
          );
        }
      } else if (relatedIsCarbon) {
        console.warn('[ecotrust.controller.flagTransaction] related_record_id missing for carbon_record');
      }
    } catch (linkErr) {
      console.warn('[ecotrust.controller.flagTransaction] linked carbon record not updated:', linkErr.message);
    }

    return ok(res, rows[0], 'Transaction flagged for Super Admin review');
  } catch (error) {
    console.error('[ecotrust.controller.flagTransaction]', error);
    return err(res, 'Failed to flag transaction', 500);
  }
};

// ─── GET /api/ecotrust/public-leaderboard ────────────────────────────────────
//
// action_type values matched to what services ACTUALLY write:
//   approval.service.js  → 'Spoilage Alert Approved'
//   approval.service.js  → 'Route Optimization Approved'
//   carbon.service.js    → 'carbon_verified'
//   delivery.service.js  → 'Delivery Completed'
//
// Returns both COUNT (for ×N) and SUM of points_earned (for accurate +N)
// so LoginPage never needs hardcoded multipliers.
const getPublicLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query?.limit, 10) || 20, 50);

    const { rows } = await pool.query(
      `SELECT
         bp.business_id,
         bp.business_name,
         bp.business_type,
         COALESCE(es.current_score, 0)               AS score,
         COALESCE(es.level, 'Newcomer')               AS level,
         COALESCE(es.rank, 0)                         AS rank,

         -- ── Counts (used for ×N in the modal) ──────────────────────
         COALESCE(sp.spoilage_count,  0)              AS spoilage_actions,
         COALESCE(rt.route_count,     0)              AS route_actions,
         COALESCE(cb.carbon_count,    0)              AS carbon_actions,
         COALESCE(dl.delivery_count,  0)              AS delivery_actions,

         -- ── Actual points earned (replaces hardcoded multipliers) ───
         COALESCE(sp.spoilage_pts,    0)              AS spoilage_pts,
         COALESCE(rt.route_pts,       0)              AS route_pts,
         COALESCE(cb.carbon_pts,      0)              AS carbon_pts,
         COALESCE(dl.delivery_pts,    0)              AS delivery_pts

       FROM business_profiles bp
       LEFT JOIN ecotrust_scores es
              ON es.business_id = bp.business_id

       -- Spoilage: approval.service.js writes 'Spoilage Alert Approved'
       LEFT JOIN (
         SELECT
           business_id,
           COUNT(*)::int                        AS spoilage_count,
           COALESCE(SUM(points_earned), 0)::int AS spoilage_pts
         FROM ecotrust_transactions
         WHERE action_type = 'Spoilage Alert Approved'
           AND verification_status = 'verified'
         GROUP BY business_id
       ) sp ON sp.business_id = bp.business_id

       -- Routes: approval.service.js writes 'Route Optimization Approved'
       LEFT JOIN (
         SELECT
           business_id,
           COUNT(*)::int                        AS route_count,
           COALESCE(SUM(points_earned), 0)::int AS route_pts
         FROM ecotrust_transactions
         WHERE action_type = 'Route Optimization Approved'
           AND verification_status = 'verified'
         GROUP BY business_id
       ) rt ON rt.business_id = bp.business_id

       -- Carbon: carbon.service.js writes 'carbon_verified'
       LEFT JOIN (
         SELECT
           business_id,
           COUNT(*)::int                        AS carbon_count,
           COALESCE(SUM(points_earned), 0)::int AS carbon_pts
         FROM ecotrust_transactions
         WHERE action_type = 'carbon_verified'
           AND verification_status = 'verified'
         GROUP BY business_id
       ) cb ON cb.business_id = bp.business_id

       -- Deliveries: delivery.service.js writes 'Delivery Completed'
       -- Include 'pending' because carbon verification promotes them later
       LEFT JOIN (
         SELECT
           business_id,
           COUNT(*)::int                        AS delivery_count,
           COALESCE(SUM(points_earned), 0)::int AS delivery_pts
         FROM ecotrust_transactions
         WHERE action_type = 'Delivery Completed'
           AND verification_status IN ('verified', 'pending')
         GROUP BY business_id
       ) dl ON dl.business_id = bp.business_id

       WHERE bp.status = 'active'
       ORDER BY es.current_score DESC NULLS LAST
       LIMIT $1`,
      [limit]
    );

    const ranked = rows.map((b, i) => ({ ...b, rank: i + 1 }));

    return ok(res, ranked, 'Public leaderboard retrieved');
  } catch (e) {
    console.error('[ecotrust.controller.getPublicLeaderboard]', e);
    return err(res, 'Failed to load leaderboard', 500);
  }
};

module.exports = {
  getScore,
  getSustainableActions,
  getLeaderboard,
  getTransactionsByBusiness,
  flagTransaction,
  getPublicLeaderboard,
};