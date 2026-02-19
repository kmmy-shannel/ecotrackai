import api from './api';

class ApprovalService {
  // Get approvals for logged-in manager's role
  async getMyApprovals(status = 'pending') {
    const response = await api.get(`/approvals?status=${status}`);
    return response.data;
  }

  // Approve an item
  async approve(approvalId, notes = '') {
    const response = await api.put(`/approvals/${approvalId}/approve`, { notes });
    return response.data;
  }

  // Reject an item
  async reject(approvalId, notes = '') {
    const response = await api.put(`/approvals/${approvalId}/reject`, { notes });
    return response.data;
  }

  // Get approval counts (for badge/notification)
  async getPendingCount() {
    const response = await api.get('/approvals/count');
    return response.data;
  }

  

  async getInventoryApprovals() {
    const response = await api.get('/approvals/inventory');
    return response.data;
  }

  async submitDecision(id, decision, comments) {
    const response = await api.put(`/approvals/${id}/decision`, {
      decision,
      comments
    });
    return response.data;
  }

  async getApprovalHistory() {
    const response = await api.get('/approvals/history');
    return response.data;
  }
}

const approvalServiceInstance = new ApprovalService();
export default approvalServiceInstance;
