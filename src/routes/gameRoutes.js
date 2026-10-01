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
  activateAllGames,
  fetchGameMonetizeFeed,
  importGameMonetizeGames
} from '../controllers/gameController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Static & Administrative Endpoints (Must precede /:id)
router.get('/', getGames);
router.post('/detect-metadata', requireAdminAuth, detectMetadata);
router.post('/admin/draft-all', requireAdminAuth, draftAllGames);
router.post('/admin/activate-all', requireAdminAuth, activateAllGames);
router.post('/admin/gamemonetize/fetch', requireAdminAuth, fetchGameMonetizeFeed);
router.post('/admin/gamemonetize/import', requireAdminAuth, importGameMonetizeGames);
router.post('/', requireAdminAuth, createGame);
router.delete('/', requireAdminAuth, deleteAllGames);

// Dynamic Parameterized /:id Endpoints
router.get('/:id', getGameById);
router.post('/:id/play', recordPlay);
router.post('/:id/vote', voteGame);
router.put('/:id', requireAdminAuth, updateGame);
router.patch('/:id', requireAdminAuth, updateGame);
router.delete('/:id', requireAdminAuth, deleteGame);
router.patch('/:id/featured', requireAdminAuth, toggleFeatured);

export default router;
