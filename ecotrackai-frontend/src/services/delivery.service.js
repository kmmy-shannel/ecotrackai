import api from './api';
import routingService from './routing.service';
import { canTransitionRoute } from '../utils/statusMachines';

const extractPayload = (responseData) => {
  if (!responseData || typeof responseData !== 'object') return null;
  if (responseData.data?.data) return responseData.data.data;
  if (responseData.data) return responseData.data;
  return responseData;
};

const assertRouteTransition = (currentStatus, nextStatus, actionLabel) => {
  if (currentStatus && !canTransitionRoute(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid route transition for ${actionLabel}: ${currentStatus} -> ${nextStatus}`
    );
  }
};

class DeliveryService {
  async getMetricsSummary() {
    const response = await api.get('/deliveries/metrics');
    return response.data;
  }

  async getAllDeliveries(params = {}) {
    const response = await api.get('/deliveries', { params });
    return response.data;
    
  }

  async getDraftDeliveries() {
    const response = await api.get('/deliveries/drafts');
    return response.data;
  }

  async getDeliveryById(id) {
    const response = await api.get(`/deliveries/${id}`);
    return response.data;
  }

  async createDelivery(deliveryData) {
    const response = await api.post('/deliveries', deliveryData);
    return response.data;
  }

  async updateDelivery(id, deliveryData) {
    const response = await api.put(`/deliveries/${id}`, deliveryData);
    return response.data;
  }

  async deleteDelivery(id) {
    const response = await api.delete(`/deliveries/${id}`);
    return response.data;
  }

  // ── ADDED: fetch drivers registered in this business ──────────
  async getDrivers() {
    const response = await api.get('/deliveries/drivers');
    return response.data;
  }

  async calculateRoute(coordinates) {
    const response = await api.post('/deliveries/calculate-route', { coordinates });
    return response.data;
  }
  // ─────────────────────────────────────────────────────────────

  async optimizeRoute(deliveryId) {
    const response = await api.post(`/deliveries/${deliveryId}/optimize`, {});
    const payload  = extractPayload(response.data) || {};

    const originalStops  = payload?.data?.originalRoute?.stops  || payload?.originalRoute?.stops  || [];
    const optimizedStops = payload?.data?.optimizedRoute?.stops || payload?.optimizedRoute?.stops || [];

    if (originalStops.length > 1) {
      try {
        const coordinates = originalStops.map((stop) => [stop.lng, stop.lat]);
        const route = await routingService.getRoute(coordinates);
        if (payload?.data?.originalRoute)  payload.data.originalRoute.routeGeometry  = route.geometry;
        else if (payload?.originalRoute)   payload.originalRoute.routeGeometry        = route.geometry;
      } catch (_error) { /* non-fatal */ }
    }

    if (optimizedStops.length > 1) {
      try {
        const coordinates = optimizedStops.map((stop) => [stop.lng, stop.lat]);
        const route = await routingService.getRoute(coordinates);
        if (payload?.data?.optimizedRoute)  payload.data.optimizedRoute.routeGeometry  = route.geometry;
        else if (payload?.optimizedRoute)   payload.optimizedRoute.routeGeometry        = route.geometry;
      } catch (_error) { /* non-fatal */ }
    }

    return response.data;
  }

  // ── ADDED: submit optimized route for logistics manager approval ──
  async submitForApproval(routeId) {
    const response = await api.post(`/deliveries/${routeId}/submit-for-approval`);
    return response.data;
  }
  // ─────────────────────────────────────────────────────────────────

  async applyOptimization(deliveryId, optimizedRoute, currentStatus) {
    assertRouteTransition(currentStatus, 'awaiting_approval', 'applyOptimization');
    const response = await api.put(`/deliveries/${deliveryId}/apply-optimization`, { optimizedRoute });
    return response.data;
  }

  // ── ADDED: driver execution methods ──────────────────────────
  async startDelivery(routeId, gpsPayload = {}, currentStatus) {
    assertRouteTransition(currentStatus, 'in_transit', 'startDelivery');
    const response = await api.post(`/deliveries/${routeId}/start`, gpsPayload);
    return response.data;
  }

  async markStopArrived(routeId, stopId, gpsPayload = {}, routeStatus) {
    if (routeStatus && String(routeStatus).toLowerCase() !== 'in_transit') {
      throw new Error('Cannot mark stop arrived unless route is in_transit');
    }
    const response = await api.post(`/deliveries/${routeId}/stops/${stopId}/arrive`, gpsPayload);
    return response.data;
  }

  async markStopDeparted(routeId, stopId, body = {}, routeStatus) {
    if (routeStatus && String(routeStatus).toLowerCase() !== 'in_transit') {
      throw new Error('Cannot mark stop departed unless route is in_transit');
    }
    const response = await api.post(`/deliveries/${routeId}/stops/${stopId}/depart`, body);
    return response.data;
  }

  async completeDelivery(routeId, payload = {}, currentStatus) {
    assertRouteTransition(currentStatus, 'delivered', 'completeDelivery');
    const response = await api.post(`/deliveries/${routeId}/complete`, payload);
    return response.data;
  }
  // ─────────────────────────────────────────────────────────────
}

export default new DeliveryService();
