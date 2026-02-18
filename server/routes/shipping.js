import express from 'express';
import * as ctrl from '../controllers/shippingController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSampleRead, requireSampleWrite } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.get('/', authenticate, requireSampleRead, ctrl.list);
router.get('/:id', authenticate, requireSampleRead, ctrl.getOne);
router.post('/', authenticate, requireSampleWrite, ctrl.create);
router.put('/:id', authenticate, requireSampleWrite, ctrl.update);
router.delete('/:id', authenticate, requireSampleWrite, ctrl.remove);

export default router;
