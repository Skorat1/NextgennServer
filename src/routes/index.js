<<<<<<< HEAD
    import { Router } from 'express';
=======
import { Router } from 'express';
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
import adminRoutes from './adminRoutes.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import gameRoutes from './gameRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import messageRoutes from './messageRoutes.js';
import fairRoutes from './fairRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
<<<<<<< HEAD
import blogRoutes from './blogRoutes.js';
import uploadRoutes from './uploadRoutes.js';
=======
import gamificationRoutes from './gamificationRoutes.js';
import blogRoutes from './blogRoutes.js';
import leaderboardRoutes from './leaderboardRoutes.js';
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
import { getHealth, getOnlineStats } from '../controllers/analyticsController.js';

const router = Router();

// Core health & public stats endpoints
router.get('/health', getHealth);
router.get('/stats/online', getOnlineStats);

// Admin dedicated authentication & profile router
router.use('/admin', adminRoutes);

// Feature Sub-routers mounted on /api/*
<<<<<<< HEAD
router.use('/upload', uploadRoutes);
=======
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/games', gameRoutes);
router.use('/categories', categoryRoutes);
router.use('/submissions', submissionRoutes);
router.use('/messages', messageRoutes);
router.use('/provably-fair', fairRoutes);
router.use('/analytics', analyticsRoutes);
<<<<<<< HEAD
router.use('/blog', blogRoutes);
=======
router.use('/gamification', gamificationRoutes);
router.use('/blog', blogRoutes);
router.use('/leaderboard', leaderboardRoutes);
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620

export default router;
