// ============================================================
// FILE LOCATION: backend/src/models/approval.model.js
// LAYER: Model — DB queries ONLY, no business logic
// ============================================================

const pool = require('../config/database');

const ApprovalModel = {

  // Get all approvals for a business filtered by role and status
  async findByBusinessRoleAndStatus(businessId, role, status) {
    const query = `
      SELECT 
        a.*,
        a.approval_id AS id,
        r.full_name as reviewed_by_name
      FROM manager_approvals a
      LEFT JOIN users r ON a.reviewed_by = r.user_id
      WHERE a.business_id = $1
        AND a.required_role = $2
        AND a.status = $3
      ORDER BY a.created_at DESC
    `;
    const { rows } = await pool.query(query, [businessId, role, status]);
    return rows;
  },

  // Count pending approvals for a role in a business
  async countPendingByBusinessAndRole(businessId, role) {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count
      FROM manager_approvals
      WHERE business_id = $1
        AND required_role = $2
        AND status = 'pending'
    `, [businessId, role]);
    return parseInt(rows[0].count);
  },

  // Find a single approval by ID and required role
  async findByIdAndRole(approvalId, role) {
    const { rows } = await pool.query(
      `SELECT * FROM manager_approvals WHERE approval_id = $1 AND required_role = $2`,
      [approvalId, role]
    );
    return rows[0] || null;
  },

  // Get decision history for this manager role
  async findHistoryByBusinessAndRole(businessId, role, limit = 50) {
    const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(parseInt(limit, 10), 1), 200) : 50;

    const { rows } = await pool.query(
      `
      SELECT
        a.*,
        a.approval_id AS id,
        r.full_name AS reviewed_by_name
      FROM manager_approvals a
      LEFT JOIN users r ON a.reviewed_by = r.user_id
      WHERE a.business_id = $1
        AND a.required_role = $2
        AND a.status IN ('approved', 'rejected')
      ORDER BY a.reviewed_at DESC NULLS LAST, a.updated_at DESC
      LIMIT $3
      `,
      [businessId, role, safeLimit]
    );

    return rows;
  },

  // Update approval status (approve or reject)
  async updateStatus(approvalId, status, reviewedBy, notes) {
    await pool.query(`
      UPDATE manager_approvals
      SET status       = $1,
          reviewed_by  = $2,
          reviewed_at  = NOW(),
          review_notes = $3,
          updated_at   = NOW()
      WHERE approval_id = $4
    `, [status, reviewedBy, notes || '', approvalId]);
  },
  // Create approval from admin alert acceptance
async create(data) {
  const query = `
    INSERT INTO manager_approvals (
      business_id, product_name, quantity, location,
      days_left, risk_level, ai_suggestion, priority,
      status, required_role, approval_type, submitted_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,$11)
    RETURNING *
  `;
  const { rows } = await pool.query(query, [
    data.businessId,
    data.productName,
    data.quantity || 'N/A',
    data.location || 'N/A',
    data.daysLeft || 0,
    data.riskLevel || 'MEDIUM',
    data.aiSuggestion || '',
    data.priority || 'MEDIUM',
    data.requiredRole || 'inventory_manager',
    data.approvalType || 'spoilage_action',
    data.submittedBy
  ]);
  return rows[0];
},
 async updateStatusWithRole(approvalId, status, reviewedBy, notes, decidedByRole) {
    await pool.query(`
      UPDATE manager_approvals
      SET status          = $1,
          reviewed_by     = $2,
          reviewed_at     = NOW(),
          review_notes    = $3,
          decided_by_role = $4,
          updated_at      = NOW()
      WHERE approval_id   = $5
    `, [status, reviewedBy, notes || '', decidedByRole, approvalId]);
  }



};

module.exports = ApprovalModel;
