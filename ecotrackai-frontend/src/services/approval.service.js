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
};

export default approvalService;