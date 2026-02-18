import express from 'express';
import * as ctrl from '../controllers/samplesController.js';
import stages from './stages.js';
import shipping from './shipping.js';
import audit from './audit.js';
import { authenticate } from '../middleware/auth.js';
import { requireSampleRead, requireSampleWrite } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.get('/', requireSampleRead, ctrl.list);
router.get('/:sampleId/full', requireSampleRead, ctrl.getFull);
router.get('/:sampleId', requireSampleRead, ctrl.getOne);
router.post('/', requireSampleWrite, ctrl.create);
router.put('/:sampleId', requireSampleWrite, ctrl.update);
router.delete('/:sampleId', requireSampleWrite, ctrl.remove);

router.use('/:sampleId/stages', stages);
router.use('/:sampleId/shipping', shipping);
router.use('/:sampleId/audit', audit);

export default router;
