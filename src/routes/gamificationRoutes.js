import { Router } from 'express';
import { getDailyQuests, claimQuestReward } from '../controllers/gamificationController.js';

const router = Router();

router.get('/quests', getDailyQuests);
router.post('/claim', claimQuestReward);

export default router;
