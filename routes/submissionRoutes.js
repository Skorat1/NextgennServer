import { Router } from 'express';
import {
  getSubmissions,
  createSubmission,
  updateSubmission,
  deleteSubmission
} from '../controllers/submissionController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public: Developer submit new game
router.post('/', createSubmission);

// Protected: Admin manage submissions
router.get('/', requireAdminAuth, getSubmissions);
router.patch('/:id', requireAdminAuth, updateSubmission);
router.delete('/:id', requireAdminAuth, deleteSubmission);

export default router;
