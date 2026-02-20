import express from 'express';
import * as ctrl from '../controllers/sampleTypesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireFeatureRead, requireFeatureWrite } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireFeatureRead('SAMPLE_TYPES'), ctrl.list);
router.get('/:id', requireFeatureRead('SAMPLE_TYPES'), ctrl.getOne);
router.post('/', requireFeatureWrite('SAMPLE_TYPES'), ctrl.create);
router.put('/:id', requireFeatureWrite('SAMPLE_TYPES'), ctrl.update);
router.delete('/:id', requireFeatureWrite('SAMPLE_TYPES'), ctrl.remove);

export default router;
