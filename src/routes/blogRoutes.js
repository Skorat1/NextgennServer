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

<<<<<<< HEAD
// Admin-only endpoints (must precede generic /:id parameter)
router.get('/admin/all', requireAdminAuth, getAllPostsAdmin);

// Public endpoints
router.get('/', getAllPosts);
router.get('/:id', getPostById);
=======
// Public endpoints
router.get('/', getAllPosts);
router.get('/:id', getPostById);

// Admin-only endpoints
router.get('/admin/all', requireAdminAuth, getAllPostsAdmin);
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
router.post('/', requireAdminAuth, createPost);
router.post('/upload-image', requireAdminAuth, uploadBlogImage);
router.put('/:id', requireAdminAuth, updatePost);
router.delete('/:id', requireAdminAuth, deletePost);
router.patch('/:id/publish', requireAdminAuth, togglePublish);
router.patch('/:id/featured', requireAdminAuth, toggleFeatured);

export default router;
