import express from 'express';
import auth from './auth.js';
import users from './users.js';
import brands from './brands.js';
import seasons from './seasons.js';
import divisions from './divisions.js';
import productCategories from './productCategories.js';
import sampleTypes from './sampleTypes.js';
import roles from './roles.js';
import samples from './samples.js';
import analytics from './analytics.js';
import exportRoutes from './export.js';
import lookups from './lookups.js';

const router = express.Router();

router.use('/auth', auth);
router.use('/users', users);
router.use('/brands', brands);
router.use('/seasons', seasons);
router.use('/divisions', divisions);
router.use('/product-categories', productCategories);
router.use('/sample-types', sampleTypes);
router.use('/roles', roles);
router.use('/samples', samples);
router.use('/analytics', analytics);
router.use('/export', exportRoutes);
router.use('/lookups', lookups);

export default router;
