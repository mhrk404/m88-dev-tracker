import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAnalyticsOrExport } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate, requireAnalyticsOrExport);

router.get('/submission-performance', analyticsController.submissionPerformance);
router.get('/submission-performance/stream', analyticsController.submissionPerformanceStream);
router.get('/delivery-performance', analyticsController.deliveryPerformance);
router.get('/delivery-performance/stream', analyticsController.deliveryPerformanceStream);
router.get('/dashboard', analyticsController.dashboard);
router.get('/pipeline', analyticsController.pipeline);
router.get('/by-season', analyticsController.bySeason);
router.get('/by-brand', analyticsController.byBrand);
router.get('/by-division', analyticsController.byDivision);
router.get('/delays', analyticsController.delays);

export default router;
