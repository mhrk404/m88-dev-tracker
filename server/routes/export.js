import express from 'express';
import * as ctrl from '../controllers/exportController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAnalyticsOrExport } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate, requireAnalyticsOrExport);

router.get('/samples', ctrl.samples);
router.get('/pipeline', ctrl.pipeline);
router.get('/analytics', ctrl.analytics);

export default router;
