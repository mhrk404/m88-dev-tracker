import express from 'express';
import * as ctrl from '../controllers/divisionsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireFeatureRead, requireFeatureWrite } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireFeatureRead('DIVISIONS'), ctrl.list);
router.get('/:id', requireFeatureRead('DIVISIONS'), ctrl.getOne);
router.post('/', requireFeatureWrite('DIVISIONS'), ctrl.create);
router.put('/:id', requireFeatureWrite('DIVISIONS'), ctrl.update);
router.delete('/:id', requireFeatureWrite('DIVISIONS'), ctrl.remove);

export default router;
