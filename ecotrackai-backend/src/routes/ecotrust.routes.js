console.log('[ecotrust.routes] FILE LOADED');
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getScore, getSustainableActions, getLeaderboard } = require('../controllers/ecotrust.controller');

// ADD THIS:
router.use((req, res, next) => {
  console.log('[ecotrust router hit]', req.method, req.path);
  next();
});

router.use(authenticate);
router.get('/score',       getScore);
router.get('/actions',     getSustainableActions);
router.get('/leaderboard', getLeaderboard);

module.exports = router;