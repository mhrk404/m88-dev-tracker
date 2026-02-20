import express from 'express';
import * as ctrl from '../controllers/seasonsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireFeatureRead, requireFeatureWrite } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireFeatureRead('SEASONS'), ctrl.list);
router.get('/:id', requireFeatureRead('SEASONS'), ctrl.getOne);
router.post('/', requireFeatureWrite('SEASONS'), ctrl.create);
router.put('/:id', requireFeatureWrite('SEASONS'), ctrl.update);
router.delete('/:id', requireFeatureWrite('SEASONS'), ctrl.remove);
export default router;
