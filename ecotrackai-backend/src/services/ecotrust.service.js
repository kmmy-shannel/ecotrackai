// ============================================================
// FILE: ecotrackai-backend/src/services/ecotrust.service.js
// ============================================================
const pool = require('../config/database');

const TRUST_LEVELS = [
  { level: 1, name: 'Newcomer',     minPoints: 0,    maxPoints: 499  },
  { level: 2, name: 'Eco Warrior',  minPoints: 500,  maxPoints: 999  },
  { level: 3, name: 'Eco Champion', minPoints: 1000, maxPoints: 1999 },
  { level: 4, name: 'Eco Leader',   minPoints: 2000, maxPoints: 3999 },
  { level: 5, name: 'Eco Legend',   minPoints: 4000, maxPoints: null },
];

const resolveLevel = (totalPoints) => {
  const pts = Number(totalPoints) || 0;
  const current = [...TRUST_LEVELS].reverse().find(l => pts >= l.minPoints) || TRUST_LEVELS[0];
  const next    = TRUST_LEVELS.find(l => l.level === current.level + 1) || null;
  const progressBase   = current.minPoints;
  const progressTarget = next ? next.minPoints : current.minPoints;
  const progressPct    = next
    ? Math.min(100, Math.round(((pts - progressBase) / (progressTarget - progressBase)) * 100))
    : 100;

  return {
    currentLevel:    current,
    nextLevel:       next,
    progressPct,
    pointsToNext:    next ? Math.max(0, next.minPoints - pts) : 0,
  };
};

const EcoTrustService = {
  _ok:   (data) => ({ success: true,  data }),
  _fail: (msg)  => ({ success: false, error: msg }),

  // ── GET /api/ecotrust/score ───────────────────────────────
  async getScore(businessId) {
    try {
      // Total verified points
      const { rows: [totRow] } = await pool.query(`
        SELECT COALESCE(SUM(points_earned), 0)::int AS total_points
        FROM ecotrust_transactions
        WHERE business_id = $1
          AND verification_status IN ('verified', 'pending')
      `, [businessId]);

      const totalPoints = Number(totRow?.total_points) || 0;
      const levelInfo   = resolveLevel(totalPoints);

      // Recent transactions (last 20)
      const { rows: transactions } = await pool.query(`
        SELECT
          et.transaction_id,
          et.action_type,
          et.points_earned,
          et.related_record_type,
          et.related_record_id,
          et.verification_status,
          et.transaction_date,
          et.created_at,
          sa.description,
          sa.action_category
        FROM ecotrust_transactions et
        LEFT JOIN sustainable_actions sa
          ON sa.action_name = et.action_type
        WHERE et.business_id = $1
        ORDER BY et.created_at DESC
        LIMIT 20
      `, [businessId]);

      // Points breakdown by category
      const { rows: breakdown } = await pool.query(`
        SELECT
          COALESCE(sa.action_category, 'other') AS category,
          SUM(et.points_earned)::int      AS total_points,
          COUNT(*)::int                   AS count
        FROM ecotrust_transactions et
        LEFT JOIN sustainable_actions sa ON sa.action_name = et.action_type
        WHERE et.business_id = $1
          AND et.verification_status IN ('verified', 'pending')
        GROUP BY sa.action_category
        ORDER BY total_points DESC
      `, [businessId]);

      return this._ok({
        current_score:   totalPoints,
        level:           levelInfo.currentLevel.name,
        level_number:    levelInfo.currentLevel.level,
        next_level:      levelInfo.nextLevel?.name || null,
        next_level_pts:  levelInfo.nextLevel?.minPoints || null,
        points_to_next:  levelInfo.pointsToNext,
        progress_pct:    levelInfo.progressPct,
        transactions,
        breakdown,
        levels: TRUST_LEVELS,
      });
    } catch (err) {
      console.error('[EcoTrustService.getScore]', err);
      return this._fail(err.message);
    }
  },

  // ── GET /api/ecotrust/actions ─────────────────────────────
  // Returns all sustainable actions with their point values
  async getSustainableActions(businessId) {
    try {
      const { rows } = await pool.query(`
        SELECT
          sa.action_id,
          sa.action_name,
          sa.points_value,
          sa.action_category,
          sa.description,
          COUNT(et.transaction_id)::int AS times_earned,
          COALESCE(SUM(et.points_earned), 0)::int AS total_earned
        FROM sustainable_actions sa
        LEFT JOIN ecotrust_transactions et
          ON et.action_type = sa.action_name
          AND et.business_id = $1
        GROUP BY sa.action_id, sa.action_name, sa.points_value, sa.action_category, sa.description
        ORDER BY sa.points_value DESC
      `, [businessId]);
      return this._ok(rows);
    } catch (err) {
      console.error('[EcoTrustService.getSustainableActions]', err);
      return this._fail(err.message);
    }
  },

  // Compatibility shim: some controllers call recalculateBusinessScore().
  // We simply delegate to getScore which already recomputes totals on the fly.
  async recalculateBusinessScore(context = {}) {
    const businessId = context.businessId || context.business_id;
    if (!businessId) return this._fail('businessId is required');
    return this.getScore(businessId);
  },
};

module.exports = EcoTrustService;
