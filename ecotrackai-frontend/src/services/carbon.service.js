import api from './api';
import { canTransitionCarbon } from '../utils/statusMachines';

class CarbonService {
  async getCarbonFootprint() {
    const response = await api.get('/carbon');
    return response.data;
  }

  async getMonthlyComparison() {
    const response = await api.get('/carbon/monthly');
    return response.data;
  }

  async verifyCarbonRecord(carbonRecordId, decision, notes = '', currentStatus = 'pending') {
    if (!canTransitionCarbon(currentStatus, decision)) {
      throw new Error(`Invalid carbon transition: ${currentStatus} -> ${decision}`);
    }

    const response = await api.patch(`/carbon/${carbonRecordId}/verify`, {
      decision,
      notes,
    });
    return response.data;
  }

  async requestRevision(carbonRecordId, notes = '', currentStatus = 'pending') {
    return this.verifyCarbonRecord(
      carbonRecordId,
      'revision_requested',
      notes,
      currentStatus
    );
  }
}

export default new CarbonService();
