import express from 'express';
import * as ctrl from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSampleRead } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

// Get audit logs for a specific sample
router.get('/', authenticate, requireSampleRead, ctrl.getAudit);

// Get sample history and status transitions
router.get('/history', authenticate, requireSampleRead, ctrl.getSampleHistory);

export default router;
