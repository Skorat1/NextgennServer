/**
 * Dynamic Daily Quests & Gamification Engine
 */

const BADGE_DEFINITIONS = [
  { id: 'first_play', name: 'First Blood', description: 'Play your first game on NextGenn', icon: '🎮', xpBonus: 50 },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Play 3 different Racing or Action games', icon: '🏎️', xpBonus: 100 },
  { id: 'arcade_master', name: 'Arcade Master', description: 'Reach Level 5 or score over 10,000 pts', icon: '🕹️', xpBonus: 200 },
  { id: 'social_star', name: 'Social Star', description: 'Save 3 favorite games to your library', icon: '⭐', xpBonus: 75 },
  { id: 'night_owl', name: 'Night Owl', description: 'Play a game after 9:00 PM local time', icon: '🌙', xpBonus: 60 },
  { id: 'quest_champion', name: 'Quest Champion', description: 'Complete all 3 daily quests in a single day', icon: '🏆', xpBonus: 300 }
];

export function getDailyQuests(req, res) {
  const today = new Date().toISOString().slice(0, 10);

  // Deterministic daily missions based on date seed
  const quests = [
    {
      id: `quest_play_3_${today}`,
      title: 'Arcade Enthusiast',
      description: 'Play any 3 arcade or action games today',
      icon: '🔥',
      target: 3,
      rewardXp: 150,
      actionType: 'PLAY_GAME',
      filterCategory: null
    },
    {
      id: `quest_favorite_1_${today}`,
      title: 'Curator',
      description: 'Bookmark at least 1 game to your favorites drawer',
      icon: '❤️',
      target: 1,
      rewardXp: 75,
      actionType: 'ADD_FAVORITE',
      filterCategory: null
    },
    {
      id: `quest_submit_score_${today}`,
      title: 'Hall of Fame',
      description: 'Submit your high score to any game leaderboard',
      icon: '🏆',
      target: 1,
      rewardXp: 200,
      actionType: 'SUBMIT_SCORE',
      filterCategory: null
    }
  ];

  return res.json({
    date: today,
    quests,
    badges: BADGE_DEFINITIONS
  });
}

export function claimQuestReward(req, res) {
  const { questId, currentXp = 0 } = req.body;
  if (!questId) {
    return res.status(400).json({ error: 'questId is required' });
  }

  // Calculate XP bonus
  let rewardXp = 100;
  if (questId.includes('play_3')) rewardXp = 150;
  if (questId.includes('favorite')) rewardXp = 75;
  if (questId.includes('submit_score')) rewardXp = 200;

  const newTotalXp = Number(currentXp) + rewardXp;
  const newLevel = Math.floor(Math.sqrt(newTotalXp / 100)) + 1;

  return res.json({
    success: true,
    questId,
    rewardXp,
    newTotalXp,
    newLevel,
    message: `Congratulations! Earned +${rewardXp} XP!`
  });
}
