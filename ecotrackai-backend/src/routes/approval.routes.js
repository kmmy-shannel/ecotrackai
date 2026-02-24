const { Router } = require('express');
const {
  getApprovals,
  getPendingCount,
  getApprovalHistory,
  approveItem,
  rejectItem,
  createFromAlert,
  requestAdminReview,
  getAdminRequests,
  adminReviewRequest,
  createFromDelivery,
} = require('../controllers/approval.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

// ── General ────────────────────────────────────────────────────────────────
router.get('/',              getApprovals);       // GET /api/approvals?status=pending&role=...
router.get('/history',       getApprovalHistory); // GET /api/approvals/history
router.get('/admin-requests', getAdminRequests);  // GET /api/approvals/admin-requests

// ── Pending count (admin dashboard badge) ─────────────────────────────────
// GET /api/approvals/pending-count?role=inventory_manager
router.get('/pending-count', getPendingCount);

// ── Role-specific queues (called by each manager page) ────────────────────
// These are shortcuts that pass the role via query param to the same controller
router.get('/logistics', (req, res) => {
  req.query.role = 'logistics_manager';
  return getApprovals(req, res);
});

router.get('/inventory', (req, res) => {
  req.query.role = 'inventory_manager';
  return getApprovals(req, res);
});

router.get('/sustainability', (req, res) => {
  req.query.role = 'sustainability_manager';
  return getApprovals(req, res);
});

// ── Create approvals ───────────────────────────────────────────────────────
router.post('/from-alert',    createFromAlert);    // POST /api/approvals/from-alert
router.post('/from-delivery', createFromDelivery); // POST /api/approvals/from-delivery

// ── Decision endpoint (used by all manager pages) ─────────────────────────
// PATCH /api/approvals/:approvalId/decision  { decision: 'approved'|'declined', review_notes }
router.patch('/:approvalId/decision', async (req, res) => {
  const { decision, review_notes } = req.body;
  if (decision === 'approved') {
    req.body.notes = review_notes;
    return approveItem(req, res);
  } else {
    req.body.notes = review_notes;
    return rejectItem(req, res);
  }
});

// ── Legacy approve/reject routes (keep for backwards compatibility) ────────
router.put('/:approvalId/approve', approveItem);
router.put('/:approvalId/reject',  rejectItem);

// ── Admin escalation ───────────────────────────────────────────────────────
router.post('/:approvalId/request-admin', requestAdminReview);
router.put('/:approvalId/admin-review',   adminReviewRequest);

module.exports = router;