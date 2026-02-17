// ============================================================
// FILE LOCATION: backend/src/controllers/delivery.controller.js
// LAYER: Controller (View) — HTTP handling ONLY
// No DB queries. No business logic. Only req/res.
// ============================================================

const DeliveryService = require('../services/delivery.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// GET /api/deliveries
const getAllDeliveries = async (req, res) => {
  try {
    console.log('Fetching deliveries for user:', req.user.userId);
    const result = await DeliveryService.getAllDeliveries(req.user.businessId);
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch deliveries'
    });
  }
};

// GET /api/deliveries/:id
const getDelivery = async (req, res) => {
  try {
    const result = await DeliveryService.getDelivery(req.params.id);
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch delivery'
    });
  }
};

// POST /api/deliveries
const createDelivery = async (req, res) => {
  try {
    console.log('Creating new delivery for user:', req.user.userId);
    const result = await DeliveryService.createDelivery(req.user.businessId, req.body);
    res.status(201).json({ success: true, message: 'Delivery created successfully', ...result });

  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to create delivery'
    });
  }
};

// POST /api/deliveries/:id/optimize
const optimizeRoute = async (req, res) => {
  try {
    const result = await DeliveryService.optimizeRoute(req.params.id);
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to optimize route'
    });
  }
};

// PUT /api/deliveries/:id/apply-optimization
const applyOptimization = async (req, res) => {
  try {
    console.log('Applying optimization for delivery:', req.params.id);
    const result = await DeliveryService.applyOptimization(
      req.params.id,
      req.body.optimizedRoute
    );
    res.json({ success: true, message: 'Optimization applied successfully', ...result });

  } catch (error) {
    console.error('Apply optimization error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to apply optimization'
    });
  }
};

// DELETE /api/deliveries/:id
const deleteDelivery = async (req, res) => {
  try {
    console.log('Deleting delivery:', req.params.id);
    await DeliveryService.deleteDelivery(req.params.id);
    res.json({ success: true, message: 'Delivery deleted successfully' });

  } catch (error) {
    console.error('Delete delivery error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to delete delivery'
    });
  }
};

module.exports = {
  getAllDeliveries,
  getDelivery,
  createDelivery,
  optimizeRoute,
  applyOptimization,
  deleteDelivery
};