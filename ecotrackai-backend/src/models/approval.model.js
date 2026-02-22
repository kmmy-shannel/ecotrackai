// ============================================================
// FILE LOCATION: backend/src/models/approval.model.js
// FIX: Uses created_at (exists) not updated_at (doesn't exist)
// ============================================================

const pool = require('../config/database');

const ApprovalModel = {

  async findByBusinessAndStatus(businessId, status) {
    const { rows } = await pool.query(
      `SELECT *, approval_id AS id
       FROM manager_approvals
       WHERE business_id = $1
         AND status = $2
       ORDER BY
         CASE priority
           WHEN 'HIGH'   THEN 1
           WHEN 'MEDIUM' THEN 2
           WHEN 'LOW'    THEN 3
           ELSE 4
         END,
         created_at DESC NULLS LAST`,
      [businessId, status]
    );
    return rows;
  },

  async findByBusinessRoleAndStatus(businessId, role, status) {
    const { rows } = await pool.query(
      `SELECT *, approval_id AS id
       FROM manager_approvals
       WHERE business_id   = $1
         AND required_role = $2
         AND status        = $3
       ORDER BY
         CASE priority
           WHEN 'HIGH'   THEN 1
           WHEN 'MEDIUM' THEN 2
           WHEN 'LOW'    THEN 3
           ELSE 4
         END,
         created_at DESC NULLS LAST`,
      [businessId, role, status]
    );
    return rows;
  },

  async countPendingByBusinessAndRole(businessId, role) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count
       FROM manager_approvals
       WHERE business_id   = $1
         AND required_role = $2
         AND status        = 'pending'`,
      [businessId, role]
    );
    return parseInt(rows[0].count, 10);
  },

  async findByIdAndRole(approvalId, role) {
    const { rows } = await pool.query(
      `SELECT *, approval_id AS id
       FROM manager_approvals
       WHERE approval_id   = $1
         AND required_role = $2`,
      [approvalId, role]
    );
    return rows[0] || null;
  },

  async findHistoryByBusinessAndRole(businessId, role, limit = 50) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT *, approval_id AS id
       FROM manager_approvals
       WHERE business_id   = $1
         AND required_role = $2
         AND status        IN ('approved', 'rejected')
       ORDER BY
         COALESCE(reviewed_at, decision_date, created_at) DESC NULLS LAST
       LIMIT $3`,
      [businessId, role, safeLimit]
    );
    return rows;
  },

  async create(data) {
    const { rows } = await pool.query(
      `INSERT INTO manager_approvals (
         business_id, product_name, quantity, location,
         days_left, risk_level, ai_suggestion, priority,
         status, required_role, approval_type, submitted_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,$11)
       RETURNING *, approval_id AS id`,
      [
        data.businessId,
        data.productName,
        data.quantity     || 'N/A',
        data.location     || 'N/A',
        data.daysLeft     || 0,
        data.riskLevel    || 'MEDIUM',
        data.aiSuggestion || '',
        data.priority     || 'MEDIUM',
        data.requiredRole || 'inventory_manager',
        data.approvalType || 'spoilage_action',
        data.submittedBy  || null,
      ]
    );
    return rows[0];
  },

  async updateStatusWithRole(approvalId, status, reviewedBy, notes, decidedByRole) {
    await pool.query(
      `UPDATE manager_approvals
       SET status          = $1,
           reviewed_by     = $2,
           reviewed_at     = NOW(),
           review_notes    = $3,
           decided_by_role = $4,
           decision        = $1,
           decision_notes  = $3,
           decision_date   = NOW(),
           manager_user_id = $2
       WHERE approval_id   = $5`,
      [status, reviewedBy, notes || '', decidedByRole || '', approvalId]
    );
  },
};

module.exports = ApprovalModel;