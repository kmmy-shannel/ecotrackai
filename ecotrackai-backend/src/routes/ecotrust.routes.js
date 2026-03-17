console.log('[ecotrust.routes] FILE LOADED');
const express = require('express');
const router  = express.Router();

// ── Middleware ────────────────────────────────────────────────────────────────
const { authenticate, authorize } = require('../middleware/auth.middleware');

// ── Controller ────────────────────────────────────────────────────────────────
const {
  getScore,
  getSustainableActions,
  getLeaderboard,
  getTransactionsByBusiness,
  flagTransaction,
  getPublicLeaderboard,        // ← NEW: no auth needed
} = require('../controllers/ecotrust.controller');

// ── Debug logger ─────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  console.log('[ecotrust router hit]', req.method, req.path);
  next();
});

// ── PUBLIC route — must be BEFORE router.use(authenticate) ───────────────────
// Called by the login page leaderboard — no token required
router.get('/public-leaderboard', getPublicLeaderboard);

// ── All routes below this line require authentication ─────────────────────────
router.use(authenticate);

router.get('/score',       getScore);
router.get('/actions',     getSustainableActions);
router.get('/leaderboard', getLeaderboard);

// ── Sustainability Manager routes ─────────────────────────────────────────────
router.get(
  '/transactions',
  authorize('sustainability_manager', 'admin'),
  getTransactionsByBusiness
);

router.post(
  '/transactions/:id/flag',
  authorize('sustainability_manager'),
  flagTransaction
);

module.exports = router;