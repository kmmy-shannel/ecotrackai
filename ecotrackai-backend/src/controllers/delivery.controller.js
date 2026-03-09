// ============================================================
// FILE: src/controllers/delivery.controller.js
// ============================================================
const DeliveryService = require('../services/delivery.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

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
  result.success ? sendSuccess(res, 200, 'Route optimized', result.data)
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

const getDrivers = async (req, res) => {
  const result = await DeliveryService.getDrivers(req.user);
  result.success ? sendSuccess(res, 200, 'Drivers retrieved', result.data)
                 : sendError(res, 400, result.error);
};

// ── Direct status patch (used by logistics manager) ──────
const updateRouteStatus = async (req, res) => {
  const { status } = req.body;
  if (!status) return sendError(res, 400, 'status is required');
  const result = await DeliveryService.updateRouteStatusDirect(req.params.id, req.user, status);
  result.success ? sendSuccess(res, 200, 'Route status updated', result.data)
                 : sendError(res, 400, result.error);
};

// ── ORS proxy ─────────────────────────────────────────────
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

module.exports = {
  getAllDeliveries, getDelivery, createDelivery,
  optimizeRoute, submitForApproval, applyOptimization,
  startDelivery, markStopArrived, markStopDeparted,
  completeDelivery, deleteDelivery, getDrivers,
  updateRouteStatus,
  calculateRoute
};