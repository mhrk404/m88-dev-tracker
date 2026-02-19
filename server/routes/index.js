import express from 'express';
import auth from './auth.js';
import users from './users.js';
import brands from './brands.js';
import seasons from './seasons.js';
import styles from './styles.js';
import samples from './samples.js';
import stages from './stages.js';
import audit from './audit.js';
import analytics from './analytics.js';
import exportRoutes from './export.js';
import lookups from './lookups.js';
import divisions from './divisions.js';
import productCategories from './product-categories.js';
import sampleTypes from './sample-types.js';
import roles from './roles.js';

const router = express.Router();

router.use('/auth', auth);
router.use('/users', users);
router.use('/brands', brands);
router.use('/seasons', seasons);
router.use('/styles', styles);
router.use('/samples', samples);
router.use('/stages/:sampleId', stages);
router.use('/audit/:sampleId', audit);
router.use('/analytics', analytics);
router.use('/export', exportRoutes);
router.use('/lookups', lookups);
router.use('/divisions', divisions);
router.use('/product-categories', productCategories);
router.use('/sample-types', sampleTypes);
router.use('/roles', roles);


export default router;
