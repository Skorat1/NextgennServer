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
<<<<<<< HEAD
  activateAllGames,
=======
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
  fetchGameMonetizeFeed,
  importGameMonetizeGames
} from '../controllers/gameController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

<<<<<<< HEAD
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
=======
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
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
router.patch('/:id/featured', requireAdminAuth, toggleFeatured);

export default router;
