import { Router } from 'express';
import {
  getGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  deleteAllGames,
  toggleFeatured,
  recordPlay,
  voteGame,
  detectMetadata,
  draftAllGames,
  fetchGameMonetizeFeed,
  importGameMonetizeGames
} from '../controllers/gameController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public game endpoints (Players & Visitors)
router.get('/', getGames);
router.get('/:id', getGameById);
router.post('/:id/play', recordPlay);
router.post('/:id/vote', voteGame);

// Protected Admin game operations
router.post('/detect-metadata', requireAdminAuth, detectMetadata);
router.post('/admin/draft-all', requireAdminAuth, draftAllGames);
router.post('/admin/gamemonetize/fetch', requireAdminAuth, fetchGameMonetizeFeed);
router.post('/admin/gamemonetize/import', requireAdminAuth, importGameMonetizeGames);
router.post('/', requireAdminAuth, createGame);
router.put('/:id', requireAdminAuth, updateGame);
router.delete('/:id', requireAdminAuth, deleteGame);
router.delete('/', requireAdminAuth, deleteAllGames);
router.patch('/:id/featured', requireAdminAuth, toggleFeatured);

export default router;
