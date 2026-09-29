import { Router } from 'express';
import { submitScore, getLeaderboard, getChampions } from '../controllers/leaderboardController.js';

const router = Router();

router.post('/submit', submitScore);
router.get('/champions', getChampions);
router.get('/:gameId', getLeaderboard);

export default router;
