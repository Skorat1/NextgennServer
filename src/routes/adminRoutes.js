import { Router } from 'express';
import { loginAdmin, getAdminMe, createAdmin, logoutAdmin } from '../controllers/adminController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public Admin Login Endpoint
router.post('/login', loginAdmin);

// Protected Admin Operations
router.get('/me', requireAdminAuth, getAdminMe);
router.post('/create', requireAdminAuth, createAdmin);
router.post('/logout', requireAdminAuth, logoutAdmin);

export default router;
