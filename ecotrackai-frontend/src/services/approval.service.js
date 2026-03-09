import api from './api';

const approvalService = {

  // ─── Admin: send optimised route to logistics manager queue ───────────────
  // POST /api/approvals/from-delivery
  createFromDelivery: async (payload) => {
    const response = await api.post('/approvals/from-delivery', payload);
    return response.data;
  },

  // ─── Logistics Manager: fetch pending approvals ───────────────────────────
  // GET /api/approvals/logistics
  getLogisticsApprovals: async (viewerRole = null) => {
    const params = viewerRole === 'admin' ? { viewer_role: 'admin' } : {};
    const response = await api.get('/approvals/logistics', { params });
    return response.data;
  },

  // ─── Logistics Manager: approve or decline a route ────────────────────────
  // PATCH /api/approvals/:id/decision
  submitDecision: async (approvalId, decision, comments = '') => {
    const response = await api.patch(`/approvals/${approvalId}/decision`, {
      decision,
      review_notes: comments,
    });
    return response.data;
  },

  // ─── Shared: approval history ─────────────────────────────────────────────
  // GET /api/approvals/history
  getApprovalHistory: async (limit = 50, roleOverride = null) => {
    const params = { limit };
    if (roleOverride) params.role = roleOverride;
    const response = await api.get('/approvals/history', { params });
    return response.data;
  },

  // ─── Admin dashboard: pending count badge ─────────────────────────────────
  // GET /api/approvals/pending-count?role=inventory_manager
  getPendingCount: async (role = 'inventory_manager') => {
    const response = await api.get('/approvals/pending-count', { params: { role } });
    return response.data;
  },

  // ─── Inventory Manager: fetch pending spoilage approvals ──────────────────
  // GET /api/approvals/inventory
  getInventoryApprovals: async (viewerRole = null) => {
    const params = viewerRole === 'admin' ? { viewer_role: 'admin' } : {};
    const response = await api.get('/approvals/inventory', { params });
    return response.data;
  },

  // ─── Sustainability Manager: fetch pending carbon verifications ────────────
  // GET /api/approvals/sustainability
 getSustainabilityApprovals: async (viewerRole = null) => {
    const params = viewerRole === 'admin' ? { viewer_role: 'admin' } : {};
    const response = await api.get('/approvals/sustainability', { params });
    return response.data;
  },

  createFromAlert: async (payload) => {
    const response = await api.post('/approvals/from-alert', payload);
    return response.data;
  },

  getRequestsForAdmin: async () => {
    const response = await api.get('/approvals/admin-requests');
    return response.data;
  },

  adminReviewRequest: async (approvalId, decision, comment = '') => {
    const response = await api.put(`/approvals/${approvalId}/admin-review`, {
      decision,
      admin_comment: comment,
    });
    return response.data;
  },

  approveApproval: async (approvalId, note = '') => {
    const response = await api.patch(`/approvals/${approvalId}/decision`, {
      decision: 'approved',
      review_notes: note,
    });
    return response.data;
  },

  declineApproval: async (approvalId, reason) => {
    if (!reason || !String(reason).trim()) {
      throw new Error('Decline reason is required');
    }
    const response = await api.patch(`/approvals/${approvalId}/decision`, {
      decision: 'declined',
      review_notes: reason,
    });
    return response.data;
  },
};

export default approvalService;
