// ============================================================
// FILE: src/routes/delivery.routes.js
//
// Added: PATCH /:id/cancel  → cancelDelivery controller
// Everything else is unchanged — no existing route is moved or removed.
// ============================================================
const express    = require('express');
const router     = express.Router();
const DeliveryController = require('../controllers/delivery.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All delivery routes require authentication
router.use(authenticate);

// ── Draft deliveries (admin sees pre-filled suggestions from spoilage approvals)
router.get('/drafts', DeliveryController.getDraftDeliveries);

// ── CRUD + lifecycle ──────────────────────────────────────
router.get   ('/',                DeliveryController.getAllDeliveries);
router.post  ('/',                DeliveryController.createDelivery);
router.get   ('/metrics-summary', DeliveryController.getMetricsSummary);
router.get   ('/drivers',         DeliveryController.getDrivers);
router.post  ('/calculate-route', DeliveryController.calculateRoute);

router.get   ('/:id',             DeliveryController.getDelivery);
router.delete('/:id',             DeliveryController.deleteDelivery);

// ── Status transitions ────────────────────────────────────
router.post ('/:id/optimize',          DeliveryController.optimizeRoute);
router.post ('/:id/submit-approval',   DeliveryController.submitForApproval);
router.post ('/:id/apply-optimization',DeliveryController.applyOptimization);
router.post ('/:id/start',             DeliveryController.startDelivery);
router.post ('/:id/complete',          DeliveryController.completeDelivery);
router.patch('/:id/status',            DeliveryController.updateRouteStatus);

// ── Cancellation ──────────────────────────────────────────
// PATCH /api/deliveries/:id/cancel
// Body: { reason?: string }
// Allowed for: planned, awaiting_approval, approved, in_transit
// Blocked for: completed, delivered, already cancelled
router.patch('/:id/cancel', DeliveryController.cancelDelivery);

// ── Stop-level actions ────────────────────────────────────
router.post('/:id/stops/:stopId/arrived',  DeliveryController.markStopArrived);
router.post('/:id/stops/:stopId/departed', DeliveryController.markStopDeparted);

module.exports = router;