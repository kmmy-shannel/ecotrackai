const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getAllDeliveries,
  getDelivery,
  createDelivery,
  optimizeRoute,
  applyOptimization,
  deleteDelivery
} = require('../controllers/delivery.controller');

router.get('/',                       authenticate, getAllDeliveries);
router.get('/:id',                    authenticate, getDelivery);
router.post('/',                      authenticate, createDelivery);
router.post('/:id/optimize',          authenticate, optimizeRoute);
router.put('/:id/apply-optimization', authenticate, applyOptimization);
router.delete('/:id',                 authenticate, deleteDelivery);

module.exports = router;