import express from 'express';
import * as ctrl from '../controllers/lookupsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAuth } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', authenticate, requireAuth, ctrl.getAll);

export default router;
