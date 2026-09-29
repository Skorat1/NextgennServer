import { Router } from 'express';
import {
  getMessages,
  createMessage,
  markMessageRead,
  markAllMessagesRead,
  deleteMessage
} from '../controllers/messageController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public: Send contact message from frontend
router.post('/', createMessage);

// Protected: Admin manage inbox messages
router.get('/', requireAdminAuth, getMessages);
router.patch('/read-all', requireAdminAuth, markAllMessagesRead);
router.patch('/:id/read', requireAdminAuth, markMessageRead);
router.delete('/:id', requireAdminAuth, deleteMessage);

export default router;
