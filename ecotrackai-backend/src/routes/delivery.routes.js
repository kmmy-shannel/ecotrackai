// ============================================================
// FILE: src/routes/delivery.routes.js
// PASTE THIS FILE — replaces your existing delivery.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getAllDeliveries, getDelivery, createDelivery,
  optimizeRoute, submitForApproval, applyOptimization,
  startDelivery, markStopArrived, markStopDeparted,
  completeDelivery, deleteDelivery, getDrivers, calculateRoute,
  updateRouteStatus, getDraftDeliveries, getMetricsSummary,
} = require('../controllers/delivery.controller');

// ── Anyone authenticated can read ───────────────────────────
router.get('/',          authenticate, getAllDeliveries);
router.get('/metrics',   authenticate, getMetricsSummary);
router.get('/drivers',   authenticate, authorize('admin', 'logistics_manager'), getDrivers);
router.get('/drafts', authenticate, getDraftDeliveries);
router.post('/calculate-route', authenticate, calculateRoute);
router.get('/:id',       authenticate, getDelivery);



// ── Admin creates, optimizes, submits ───────────────────────
router.post('/',                         authenticate, authorize('admin'), createDelivery);
router.post('/:id/optimize',             authenticate, authorize('admin'), optimizeRoute);
router.post('/:id/submit-for-approval',  authenticate, authorize('admin'), submitForApproval);
router.put('/:id/apply-optimization',    authenticate, authorize('logistics_manager'), applyOptimization);

// ── Driver executes ─────────────────────────────────────────
router.post('/:id/start',                    authenticate, authorize('driver','admin'), startDelivery);
router.post('/:id/stops/:stopId/arrive',     authenticate, authorize('driver','admin'), markStopArrived);
router.post('/:id/stops/:stopId/depart',     authenticate, authorize('driver','admin'), markStopDeparted);
router.post('/:id/complete',                 authenticate, authorize('driver','admin'), completeDelivery);

// ── Admin deletes (only planned routes) ─────────────────────
router.delete('/:id', authenticate, authorize('admin'), deleteDelivery);
router.patch('/:id/status', authenticate, authorize('logistics_manager', 'admin'), updateRouteStatus);
module.exports = router;