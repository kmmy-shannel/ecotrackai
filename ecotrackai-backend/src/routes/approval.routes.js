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
} = require('../controllers/approval.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', getApprovals);
router.get('/count', getPendingCount);
router.get('/history', getApprovalHistory);
router.put('/:approvalId/approve', approveItem);
router.put('/:approvalId/reject', rejectItem);
router.post('/from-alert', createFromAlert);

router.get('/admin-requests',              getAdminRequests);
router.post('/:approvalId/request-admin',  requestAdminReview);
router.put('/:approvalId/admin-review',    adminReviewRequest);
module.exports = router;
