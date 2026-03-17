// ============================================================
// FILE: src/controllers/delivery.controller.js
//
// Cancellation feature added:
//   cancelDelivery — PATCH /api/deliveries/:id/cancel
//   Accepts optional { reason } in request body.
//   Returns 200 on success with message + previousStatus.
//   Returns 400 if status is not cancellable.
//
// Everything else is completely unchanged.
// ============================================================
const DeliveryService = require('../services/delivery.service');
const { sendSuccess, sendError } = require('../utils/response.utils');
const pool = require('../config/database');

const getAllDeliveries = async (req, res) => {
  const result = await DeliveryService.getAllDeliveries(req.user);
  result.success ? sendSuccess(res, 200, 'Deliveries retrieved', result.data)
                 : sendError(res, 400, result.error);
};

const getDelivery = async (req, res) => {
  const result = await DeliveryService.getDelivery(req.params.id, req.user);
  result.success ? sendSuccess(res, 200, 'Delivery retrieved', result.data)
                 : sendError(res, result.error === 'Access denied' ? 403 : 404, result.error);
};

const createDelivery = async (req, res) => {
  const result = await DeliveryService.createDelivery(req.user, req.body);
  result.success ? sendSuccess(res, 201, 'Delivery route created', result.data)
                 : sendError(res, 400, result.error);
};

const optimizeRoute = async (req, res) => {
  const result = await DeliveryService.optimizeRoute(req.params.id, req.user);
  result.success
    ? sendSuccess(res, 200, 'Route optimized', result.data)
    : sendError(res, 400, result.error);
};

const submitForApproval = async (req, res) => {
  const result = await DeliveryService.submitForApproval(req.params.id, req.user);
  result.success ? sendSuccess(res, 200, 'Submitted for approval', result.data)
                 : sendError(res, 400, result.error);
};

const applyOptimization = async (req, res) => {
  const result = await DeliveryService.applyOptimization(req.params.id, req.user);
  result.success ? sendSuccess(res, 200, 'Optimization applied', result.data)
                 : sendError(res, 400, result.error);
};

const startDelivery = async (req, res) => {
  const result = await DeliveryService.startDelivery(req.params.id, req.user);
  result.success ? sendSuccess(res, 200, 'Delivery started', result.data)
                 : sendError(res, 400, result.error);
};

const markStopArrived = async (req, res) => {
  const result = await DeliveryService.markStopArrived(req.params.id, req.params.stopId, req.user);
  result.success ? sendSuccess(res, 200, 'Stop arrival recorded', result.data)
                 : sendError(res, 400, result.error);
};

const markStopDeparted = async (req, res) => {
  const result = await DeliveryService.markStopDeparted(req.params.id, req.params.stopId, req.user, req.body);
  result.success ? sendSuccess(res, 200, 'Stop departure recorded', result.data)
                 : sendError(res, 400, result.error);
};

const completeDelivery = async (req, res) => {
  const result = await DeliveryService.completeDelivery(req.params.id, req.user, req.body);
  result.success ? sendSuccess(res, 200, 'Delivery completed', result.data)
                 : sendError(res, 400, result.error);
};

const deleteDelivery = async (req, res) => {
  const result = await DeliveryService.deleteDelivery(req.params.id, req.user);
  result.success ? sendSuccess(res, 200, 'Route deleted')
                 : sendError(res, 400, result.error);
};

// ── Cancellation ──────────────────────────────────────────────────────────────
// PATCH /api/deliveries/:id/cancel
// Body: { reason?: string }  — optional cancellation reason
//
// Status rules (mirrors panel answer):
//   planned            → reservations released, route deleted
//   awaiting_approval  → approval cancelled, reservations released, status → cancelled
//   approved           → reservations released, status → cancelled (driver notified)
//   in_transit         → reservations released, status → cancelled (driver alerted)
//   completed/delivered → 400 blocked
const cancelDelivery = async (req, res) => {
  try {
    const reason = req.body?.reason || req.body?.cancel_reason || '';
    const result = await DeliveryService.cancelDelivery(req.params.id, req.user, reason);

    if (result && result.success) {
      const payload = result.data || {};
      return sendSuccess(res, 200, payload.message || 'Delivery cancelled', payload);
    }

    const errMsg = result?.error || 'Failed to cancel delivery';
    return sendError(res, 400, errMsg);
  } catch (err) {
    console.error('[cancelDelivery controller]', err.message);
    return sendError(res, 500, 'Failed to cancel delivery');
  }
};

const getDrivers = async (req, res) => {
  const result = await DeliveryService.getDrivers(req.user);
  result.success ? sendSuccess(res, 200, 'Drivers retrieved', result.data)
                 : sendError(res, 400, result.error);
};

const getMetricsSummary = async (req, res) => {
  const result = await DeliveryService.getActualMetricsSummary(req.user);
  result.success ? sendSuccess(res, 200, 'Metrics summary', result.data)
                 : sendError(res, 400, result.error);
};

const updateRouteStatus = async (req, res) => {
  const { status } = req.body;
  if (!status) return sendError(res, 400, 'status is required');
  const result = await DeliveryService.updateRouteStatusDirect(req.params.id, req.user, status);
  result.success ? sendSuccess(res, 200, 'Route status updated', result.data)
                 : sendError(res, 400, result.error);
};

const calculateRoute = async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (!coordinates || coordinates.length < 2)
      return sendError(res, 400, 'At least 2 coordinates required');

    const ORS_KEY = process.env.OPENROUTE_API_KEY;
    if (!ORS_KEY)
      return sendError(res, 500, 'ORS API key not configured on server');

    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method:  'POST',
      headers: {
        'Authorization': ORS_KEY,
        'Content-Type':  'application/json',
        'Accept':        'application/json'
      },
      body: JSON.stringify({ coordinates })
    });

    const data = await response.json();
    if (!response.ok)
      return sendError(res, response.status, data.error?.message || 'OpenRouteService error');

    return sendSuccess(res, 200, 'Route calculated', data);
  } catch (error) {
    console.error('[calculateRoute]', error);
    return sendError(res, 500, 'Failed to calculate route');
  }
};

const getDraftDeliveries = async (req, res) => {
  try {
    const { businessId } = req.user;
    const result = await pool.query(`
      SELECT route_id, route_name, status, origin_location, destination_location,
             vehicle_type, created_at, COALESCE(notes, '{}') AS notes
      FROM delivery_routes
      WHERE business_id = $1 AND status = 'draft'
      ORDER BY created_at DESC
    `, [businessId]);

    sendSuccess(res, 200, 'Draft deliveries retrieved', { drafts: result.rows });
  } catch (error) {
    console.error('[getDraftDeliveries]', error.message);
    sendSuccess(res, 200, 'Draft deliveries retrieved', { drafts: [] });
  }
};

module.exports = {
  getAllDeliveries, getDelivery, createDelivery,
  optimizeRoute, submitForApproval, applyOptimization,
  startDelivery, markStopArrived, markStopDeparted,
  completeDelivery, deleteDelivery,
  cancelDelivery,        // ← NEW
  getDrivers, getMetricsSummary,
  updateRouteStatus,
  calculateRoute, getDraftDeliveries,
};
