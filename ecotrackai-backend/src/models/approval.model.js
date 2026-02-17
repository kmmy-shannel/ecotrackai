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
        u.full_name as created_by_name,
        r.full_name as reviewed_by_name
      FROM manager_approvals a
      LEFT JOIN users u ON a.business_id = u.business_id AND u.role = 'admin'
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
  }

};

module.exports = ApprovalModel;