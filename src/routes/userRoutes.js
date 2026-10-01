import { Router } from 'express';
import { getUsers, getUserById, createUser, deleteUser, updateUser, syncCloudProgress, getCloudProgress } from '../controllers/userController.js';
import { requireAdminAuth, requireSelfOrAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Cloud Game Progress Sync
router.post('/progress/sync', syncCloudProgress);
router.get('/progress/:userId', getCloudProgress);

// User management operations
router.get('/', requireAdminAuth, getUsers);
router.get('/:id', requireSelfOrAdmin, getUserById);
router.post('/', requireAdminAuth, createUser);
router.patch('/:id', requireSelfOrAdmin, updateUser);
router.put('/:id', requireSelfOrAdmin, updateUser);
router.delete('/:id', requireAdminAuth, deleteUser);

export default router;
