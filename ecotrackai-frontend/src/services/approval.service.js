import api from './api';

class ApprovalService {

  // Used by InventoryManagerPage — passes role so admin can view too
  async getInventoryApprovals(viewerRole = null) {
    const params = new URLSearchParams({ status: 'pending' });
    if (viewerRole === 'admin') params.append('role', 'inventory_manager');
    const response = await api.get(`/approvals?${params.toString()}`);
    return response.data;
  }

  async getMyApprovals(status = 'pending') {
    const response = await api.get(`/approvals?status=${status}`);
    return response.data;
  }

  async approve(approvalId, notes = '') {
    const response = await api.put(`/approvals/${approvalId}/approve`, { notes });
    return response.data;
  }

  async reject(approvalId, notes = '') {
    const response = await api.put(`/approvals/${approvalId}/reject`, { notes });
    return response.data;
  }

  async submitDecision(approvalId, decision, comments = '') {
    if (decision === 'approved') return this.approve(approvalId, comments);
    return this.reject(approvalId, comments);
  }

  async getPendingCount() {
    const response = await api.get('/approvals/count');
    return response.data;
  }

  async getApprovalHistory(limit = 50, roleOverride = null) {
    const params = new URLSearchParams({ limit });
    if (roleOverride) params.append('role', roleOverride);
    const response = await api.get(`/approvals/history?${params.toString()}`);
    return response.data;
  }

  async createFromAlert(alertData) {
    const response = await api.post('/approvals/from-alert', alertData);
    return response.data;
  }
}

const approvalServiceInstance = new ApprovalService();
export default approvalServiceInstance;