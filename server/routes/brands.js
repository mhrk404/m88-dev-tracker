import express from 'express';
import * as ctrl from '../controllers/brandsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireFeatureRead, requireFeatureWrite } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireFeatureRead('BRANDS'), ctrl.list);
router.get('/:id', requireFeatureRead('BRANDS'), ctrl.getOne);
router.post('/', requireFeatureWrite('BRANDS'), ctrl.create);
router.put('/:id', requireFeatureWrite('BRANDS'), ctrl.update);
router.delete('/:id', requireFeatureWrite('BRANDS'), ctrl.remove);
export default router;
