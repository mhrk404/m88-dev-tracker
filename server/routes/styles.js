import express from 'express';
import * as ctrl from '../controllers/stylesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSampleRead, requireSampleCreate, requireSampleUpdate } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireSampleRead, ctrl.list);
router.get('/:id', requireSampleRead, ctrl.getOne);
router.post('/', requireSampleCreate, ctrl.create);
router.put('/:id', requireSampleUpdate, ctrl.update);
router.delete('/:id', requireSampleUpdate, ctrl.remove);

export default router;
