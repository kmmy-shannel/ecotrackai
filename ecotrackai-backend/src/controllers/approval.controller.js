const ApprovalService = require('../services/approval.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// GET /api/approvals?status=pending
const getApprovals = async (req, res) => {
  try {
    const result = await ApprovalService.getApprovals(
      req.user,
      req.query.status || 'pending',
      req.query.role || null
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

// GET /api/approvals/history?limit=50
const getApprovalHistory = async (req, res) => {
  try {
    const result = await ApprovalService.getApprovalHistory(
      req.user,
      req.query.limit || 50,
      req.query.role || null
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
    const result = await ApprovalService.createFromAlert(req.user, req.body);
    sendSuccess(res, 201, 'Approval request created', result);
  } catch (error) {
    console.error('Create from alert error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to create approval');
  }
};

module.exports = {
  getApprovals,
  getPendingCount,
  getApprovalHistory,
  approveItem,
  rejectItem,
  createFromAlert
};
