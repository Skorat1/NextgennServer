import { Router } from 'express';
import { getLiveAnalytics } from '../controllers/analyticsController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/live', requireAdminAuth, getLiveAnalytics);

export default router;
