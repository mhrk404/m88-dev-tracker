import express from 'express';
import * as ctrl from '../controllers/stagesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSampleRead, requireSampleWrite } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.get('/', authenticate, requireSampleRead, ctrl.getStages);
router.put('/', authenticate, requireSampleWrite, ctrl.updateStage);
router.patch('/', authenticate, requireSampleWrite, ctrl.updateStage);

export default router;
