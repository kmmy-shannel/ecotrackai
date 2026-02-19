const { Router } = require('express');
const {
  getApprovals,
  getPendingCount,
  approveItem,
  rejectItem,
  getInventoryApprovals,
  submitApprovalDecision,
  getApprovalHistory
} = require('../controllers/approval.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', getApprovals);
router.get('/count', getPendingCount);
router.put('/:approvalId/approve', approveItem);
router.put('/:approvalId/reject', rejectItem);
router.get('/inventory',          authenticate, getInventoryApprovals);
router.put('/:id/decision',       authenticate, submitApprovalDecision);
router.get('/history',            authenticate, getApprovalHistory);

module.exports = router;