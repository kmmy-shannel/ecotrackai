// ============================================================
// FILE LOCATION: backend/src/controllers/approval.controller.js
// LAYER: Controller (View) — HTTP handling ONLY
// No DB queries. No business logic. Only req/res.
// ============================================================

const ApprovalService = require('../services/approval.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// GET /api/approvals?status=pending
const getApprovals = async (req, res) => {
  try {
    const result = await ApprovalService.getApprovals(
      req.user,
      req.query.status || 'pending'
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
    const result = await ApprovalService.getPendingCount(req.user);
    sendSuccess(res, 200, 'Pending count retrieved', result);

  } catch (error) {
    console.error('Get pending count error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to get count');
  }
};

// POST /api/approvals/:approvalId/approve
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

// POST /api/approvals/:approvalId/reject
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
// GET all pending approvals for inventory manager
const getInventoryApprovals = async (req, res) => {
  try {
    const approvals = await approvalService.getByType('inventory');
    return res.json({ success: true, data: approvals });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST approve or decline
const submitApprovalDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comments } = req.body; // decision = 'approved' | 'declined'
    const managerId = req.user.id;
    const result = await approvalService.submitDecision(id, decision, comments, managerId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET approval history for this manager
const getApprovalHistory = async (req, res) => {
  try {
    const managerId = req.user.id;
    const history = await approvalService.getHistoryByManager(managerId);
    return res.json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



module.exports = {
  getApprovals,
  getPendingCount,
  approveItem,
  rejectItem, getInventoryApprovals, submitApprovalDecision, getApprovalHistory
};