// ============================================================
// FILE: src/routes/inventory.routes.js
// ============================================================

const { Router }     = require('express');
const controller     = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

router.get('/',                     controller.getAll);
router.get('/stats',                controller.getStats);
router.get('/:id',                  controller.getById);
router.post('/',                    controller.create);
router.post('/check-compatibility', controller.checkCompatibility);
router.delete('/:id',               controller.remove);

module.exports = router;