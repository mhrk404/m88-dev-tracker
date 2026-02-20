import express from 'express';
import * as ctrl from '../controllers/usersController.js';
import { authenticate } from '../middleware/auth.js';
import { requireFeatureRead, requireFeatureWrite } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireFeatureRead('USERS'), ctrl.list);
router.get('/:id', requireFeatureRead('USERS'), ctrl.getOne);
router.post('/', requireFeatureWrite('USERS'), ctrl.create);
router.put('/:id', requireFeatureWrite('USERS'), ctrl.update);
router.delete('/:id', requireFeatureWrite('USERS'), ctrl.remove);
export default router;
