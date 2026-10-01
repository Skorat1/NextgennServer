    import { Router } from 'express';
import adminRoutes from './adminRoutes.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import gameRoutes from './gameRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import messageRoutes from './messageRoutes.js';
import fairRoutes from './fairRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import blogRoutes from './blogRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import { getHealth, getOnlineStats } from '../controllers/analyticsController.js';

const router = Router();

// Core health & public stats endpoints
router.get('/health', getHealth);
router.get('/stats/online', getOnlineStats);

// Admin dedicated authentication & profile router
router.use('/admin', adminRoutes);

// Feature Sub-routers mounted on /api/*
router.use('/upload', uploadRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/games', gameRoutes);
router.use('/categories', categoryRoutes);
router.use('/submissions', submissionRoutes);
router.use('/messages', messageRoutes);
router.use('/provably-fair', fairRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/blog', blogRoutes);

export default router;
