import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage
} from '../controllers/categoryController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public Category Discovery
router.get('/', getCategories);

// Protected Admin Category Operations
router.post('/upload-image', requireAdminAuth, uploadCategoryImage);
router.post('/', requireAdminAuth, createCategory);
router.put('/:id', requireAdminAuth, updateCategory);
<<<<<<< HEAD
router.patch('/:id', requireAdminAuth, updateCategory);
=======
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
router.delete('/:id', requireAdminAuth, deleteCategory);

export default router;
