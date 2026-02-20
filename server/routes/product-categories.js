import express from 'express';
import * as ctrl from '../controllers/productCategoriesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireFeatureRead, requireFeatureWrite } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requireFeatureRead('PRODUCT_CATEGORIES'), ctrl.list);
router.get('/:id', requireFeatureRead('PRODUCT_CATEGORIES'), ctrl.getOne);
router.post('/', requireFeatureWrite('PRODUCT_CATEGORIES'), ctrl.create);
router.put('/:id', requireFeatureWrite('PRODUCT_CATEGORIES'), ctrl.update);
router.delete('/:id', requireFeatureWrite('PRODUCT_CATEGORIES'), ctrl.remove);

export default router;
