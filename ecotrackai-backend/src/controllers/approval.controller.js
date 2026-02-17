const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response.utils');

// Map roles to what they can approve
const ROLE_APPROVAL_TYPES = {
  inventory_manager: ['spoilage_action'],
  logistics_manager: ['route_optimization'],
  sustainability_manager: ['carbon_verification'],
  finance_manager: ['cost_approval']
};

// Get approvals for the logged-in manager
const getApprovals = async (req, res) => {
  try {
    const { role, businessId, userId } = req.user;
    const { status = 'pending' } = req.query;

    const approvalTypes = ROLE_APPROVAL_TYPES[role] || [];

    if (approvalTypes.length === 0) {
      return sendSuccess(res, 200, 'No approvals for this role', { approvals: [] });
    }

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

    sendSuccess(res, 200, 'Approvals retrieved', {
      approvals: rows,
      count: rows.length,
      role
    });

  } catch (error) {
    console.error('Get approvals error:', error);
    sendError(res, 500, 'Failed to get approvals', error.message);
  }
};

// Get pending count for notification badge
const getPendingCount = async (req, res) => {
  try {
    const { role, businessId } = req.user;

    const { rows } = await pool.query(`
      SELECT COUNT(*) as count
      FROM manager_approvals
      WHERE business_id = $1
        AND required_role = $2
        AND status = 'pending'
    `, [businessId, role]);

    sendSuccess(res, 200, 'Pending count retrieved', {
      count: parseInt(rows[0].count)
    });

  } catch (error) {
    sendError(res, 500, 'Failed to get count', error.message);
  }
};

// Approve an item
const approveItem = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { approvalId } = req.params;
    const { notes } = req.body;

    // Verify this approval belongs to manager's role
    const check = await pool.query(
      `SELECT * FROM manager_approvals WHERE approval_id = $1 AND required_role = $2`,
      [approvalId, role]
    );

    if (check.rows.length === 0) {
      return sendError(res, 404, 'Approval not found or not authorized');
    }

    if (check.rows[0].status !== 'pending') {
      return sendError(res, 400, 'This item has already been reviewed');
    }

    await pool.query(`
      UPDATE manager_approvals
      SET status = 'approved',
          reviewed_by = $1,
          reviewed_at = NOW(),
          review_notes = $2,
          updated_at = NOW()
      WHERE approval_id = $3
    `, [userId, notes || '', approvalId]);

    sendSuccess(res, 200, 'Item approved successfully');

  } catch (error) {
    console.error('Approve error:', error);
    sendError(res, 500, 'Failed to approve item', error.message);
  }
};

// Reject an item
const rejectItem = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { approvalId } = req.params;
    const { notes } = req.body;

    const check = await pool.query(
      `SELECT * FROM manager_approvals WHERE approval_id = $1 AND required_role = $2`,
      [approvalId, role]
    );

    if (check.rows.length === 0) {
      return sendError(res, 404, 'Approval not found or not authorized');
    }

    if (check.rows[0].status !== 'pending') {
      return sendError(res, 400, 'This item has already been reviewed');
    }

    await pool.query(`
      UPDATE manager_approvals
      SET status = 'rejected',
          reviewed_by = $1,
          reviewed_at = NOW(),
          review_notes = $2,
          updated_at = NOW()
      WHERE approval_id = $3
    `, [userId, notes || '', approvalId]);

    sendSuccess(res, 200, 'Item rejected');

  } catch (error) {
    console.error('Reject error:', error);
    sendError(res, 500, 'Failed to reject item', error.message);
  }
};

module.exports = {
  getApprovals,
  getPendingCount,
  approveItem,
  rejectItem
};