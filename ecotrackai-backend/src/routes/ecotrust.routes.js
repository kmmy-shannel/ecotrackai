// ============================================================
// FILE: ecotrackai-backend/src/routes/ecotrust.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getScore, getSustainableActions } = require('../controllers/ecotrust.controller');

router.use(authenticate);

router.get('/score',   getScore);
router.get('/actions', getSustainableActions);

module.exports = router;
