import express from 'express';
import * as ctrl from '../controllers/rolesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireFeatureRead, requireFeatureWrite } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireFeatureRead('ROLES'), ctrl.list);
router.get('/:id', requireFeatureRead('ROLES'), ctrl.getOne);
router.get('/:id/permissions', requireFeatureWrite('ROLES'), ctrl.listPermissions);
router.put('/:id/permissions', requireFeatureWrite('ROLES'), ctrl.updatePermissions);
router.post('/', requireFeatureWrite('ROLES'), ctrl.create);
router.put('/:id', requireFeatureWrite('ROLES'), ctrl.update);
router.delete('/:id', requireFeatureWrite('ROLES'), ctrl.remove);

export default router;
