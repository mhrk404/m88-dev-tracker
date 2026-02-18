import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.post('/register', authenticate, requireAdmin, authController.register);
router.post('/login', authController.login);
router.post('/logout', optionalAuth, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
