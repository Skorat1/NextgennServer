import { query, isMySQLConnected } from '../config/db.js';
import { User } from '../models/User.js';

export async function submitScore(req, res) {
  try {
    const { gameId, score, username, userId, playerName } = req.body || {};

    if (!gameId || typeof score !== 'number') {
      return res.status(400).json({ error: 'gameId and numeric score are required' });
    }

    const safeUsername = (username || playerName || 'Player').slice(0, 50);
    const safeUserId = userId || (req.user ? req.user.id : null);
    const scoreId = `sc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    if (isMySQLConnected()) {
      await query(`
        INSERT INTO game_scores (id, gameId, userId, username, score, createdAt)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [scoreId, gameId, safeUserId, safeUsername, Math.round(score)]);

      // If user is identified, update high scores in their cloudSave
      if (safeUserId) {
        try {
          const user = await User.findOne({ id: safeUserId });
          if (user) {
            const cloudSave = user.cloudSave || {};
            const highScores = cloudSave.highScores || {};
            if (!highScores[gameId] || score > highScores[gameId]) {
              highScores[gameId] = score;
              cloudSave.highScores = highScores;
              await User.findOneAndUpdate({ id: safeUserId }, { $set: { cloudSave } });
            }
          }
        } catch (uErr) {
          console.warn('Leaderboard cloudSave sync notice:', uErr.message);
        }
      }

      // Calculate rank
      const rankRow = await query(`
        SELECT COUNT(*) + 1 AS rank FROM game_scores
        WHERE gameId = ? AND score > ?
      `, [gameId, score]);

      const rank = rankRow && rankRow[0] ? rankRow[0].rank : 1;

      return res.json({
        success: true,
        message: 'High score recorded successfully in MySQL database',
        id: scoreId,
        gameId,
        score,
        username: safeUsername,
        rank
      });
    }

    return res.json({ success: true, score });
  } catch (err) {
    console.error('Leaderboard submitScore error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getLeaderboard(req, res) {
  try {
    const { gameId } = req.params;
    const { limit = 20 } = req.query;

    if (!isMySQLConnected()) {
      return res.json([]);
    }

    const rows = await query(`
      SELECT id, gameId, username, score, createdAt
      FROM game_scores
      WHERE gameId = ?
      ORDER BY score DESC, createdAt ASC
      LIMIT ?
    `, [gameId, Number(limit) || 20]);

    return res.json(rows || []);
  } catch (err) {
    console.error('getLeaderboard error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getChampions(req, res) {
  try {
    if (!isMySQLConnected()) {
      return res.json([]);
    }

    const rows = await query(`
      SELECT username, MAX(score) AS maxScore, COUNT(*) AS totalGamesWon, MAX(createdAt) AS lastActive
      FROM game_scores
      GROUP BY username
      ORDER BY maxScore DESC
      LIMIT 10
    `);

    return res.json(rows || []);
  } catch (err) {
    console.error('getChampions error:', err);
    return res.status(500).json({ error: err.message });
  }
}
