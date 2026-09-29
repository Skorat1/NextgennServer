import { Router } from 'express';
import {
  getAllPosts,
  getAllPostsAdmin,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  togglePublish,
  toggleFeatured,
  uploadBlogImage
} from '../controllers/blogController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public endpoints
router.get('/', getAllPosts);
router.get('/:id', getPostById);

// Admin-only endpoints
router.get('/admin/all', requireAdminAuth, getAllPostsAdmin);
router.post('/', requireAdminAuth, createPost);
router.post('/upload-image', requireAdminAuth, uploadBlogImage);
router.put('/:id', requireAdminAuth, updatePost);
router.delete('/:id', requireAdminAuth, deletePost);
router.patch('/:id/publish', requireAdminAuth, togglePublish);
router.patch('/:id/featured', requireAdminAuth, toggleFeatured);

export default router;
