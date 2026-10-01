import { Router } from 'express';
import { getUsers, getUserById, createUser, deleteUser, updateUser, syncCloudProgress, getCloudProgress } from '../controllers/userController.js';
<<<<<<< HEAD
import { requireAdminAuth, requireSelfOrAdmin } from '../middleware/authMiddleware.js';
=======
import { requireAdminAuth } from '../middleware/authMiddleware.js';
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620

const router = Router();

// Cloud Game Progress Sync
router.post('/progress/sync', syncCloudProgress);
router.get('/progress/:userId', getCloudProgress);

<<<<<<< HEAD
// User management operations
router.get('/', requireAdminAuth, getUsers);
router.get('/:id', requireSelfOrAdmin, getUserById);
router.post('/', requireAdminAuth, createUser);
router.patch('/:id', requireSelfOrAdmin, updateUser);
router.put('/:id', requireSelfOrAdmin, updateUser);
=======
// All user management operations require Admin authorization
router.get('/', requireAdminAuth, getUsers);
router.get('/:id', requireAdminAuth, getUserById);
router.post('/', requireAdminAuth, createUser);
router.patch('/:id', requireAdminAuth, updateUser);
router.put('/:id', requireAdminAuth, updateUser);
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
router.delete('/:id', requireAdminAuth, deleteUser);

export default router;
