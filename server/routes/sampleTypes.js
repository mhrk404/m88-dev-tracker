import express from 'express';
import * as ctrl from '../controllers/sampleTypesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireAuth } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireAuth, ctrl.list);
router.get('/:id', requireAuth, ctrl.getOne);
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);
export default router;
