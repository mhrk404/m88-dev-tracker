import express from 'express';
import * as ctrl from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSampleRead } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.get('/', authenticate, requireSampleRead, ctrl.getAudit);

export default router;
