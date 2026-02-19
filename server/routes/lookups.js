import express from 'express';
import { getLookups } from '../controllers/lookupsController.js';

const router = express.Router();

router.get('/', getLookups);

export default router;
