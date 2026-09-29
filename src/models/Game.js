import { query, isMySQLConnected } from '../config/db.js';

function formatGame(row) {
  if (!row) return null;
  let tags = [];
  if (row.tags) {
    if (Array.isArray(row.tags)) {
      tags = row.tags;
    } else {
      try {
        tags = JSON.parse(row.tags);
      } catch {
        tags = String(row.tags).split(',').map(t => t.trim()).filter(Boolean);
      }
    }
  }

  return {
    ...row,
    tags,
    rating: typeof row.rating === 'number' ? row.rating : Number(row.rating || 4.8),
    likes: Number(row.likes || 0),
    dislikes: Number(row.dislikes || 0),
    plays: Number(row.plays || 0),
    featured: Boolean(row.featured === 1 || row.featured === true)
  };
}

export const Game = {
  async countDocuments() {
    if (!isMySQLConnected()) return 0;
    const rows = await query('SELECT COUNT(*) AS count FROM games');
    return rows[0]?.count || 0;
  },

  async find(filter = {}) {
    if (!isMySQLConnected()) return [];

    let sql = 'SELECT * FROM games WHERE 1=1';
    const params = [];

    if (filter.status === 'all') {
      // No status filter - used by admin to manage all titles
    } else if (filter.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    } else {
      // Default for public website: ONLY return active games (hide draft and maintenance)
      sql += " AND status = 'active'";
    }

    if (filter.category && filter.category !== 'all') {
      sql += ' AND LOWER(category) = LOWER(?)';
      params.push(filter.category);
    }

    if (filter.featured === true || filter.featured === 'true') {
      sql += ' AND featured = 1';
    }

    if (filter.search) {
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)';
      const term = `%${String(filter.search).toLowerCase()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY updatedAt DESC, createdAt DESC';

    if (filter.limit && !isNaN(Number(filter.limit))) {
      sql += ` LIMIT ${Number(filter.limit)}`;
    }

    const rows = await query(sql, params);
    return rows.map(formatGame);
  },

  async setAllDraft() {
    if (!isMySQLConnected()) return { affectedRows: 0 };
    return await query("UPDATE games SET status = 'draft'");
  },

  async findOne(filter = {}) {
    if (!isMySQLConnected()) return null;

    let sql = 'SELECT * FROM games WHERE 1=1';
    const params = [];

    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (rawId) {
      sql += ' AND id = ?';
      params.push(rawId);
    } else {
      for (const [key, val] of Object.entries(filter)) {
        if (key !== '$or' && val !== undefined) {
          sql += ` AND \`${key}\` = ?`;
          params.push(val);
        }
      }
    }

    sql += ' LIMIT 1';
    const rows = await query(sql, params);
    return rows.length > 0 ? formatGame(rows[0]) : null;
  },

  async create(data) {
    if (!isMySQLConnected()) return data;

    const game = { ...data };
    if (!game.id) {
      game.id = (game.title || 'game').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    }

    const tagsJson = JSON.stringify(Array.isArray(game.tags) ? game.tags : []);
    const sql = `
      INSERT INTO games (id, title, category, description, thumbnail, banner, previewVideo, gameUrl, tags, rating, likes, dislikes, plays, featured, tileSize, status, instructions, width, height, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        category = VALUES(category),
        description = VALUES(description),
        thumbnail = VALUES(thumbnail),
        banner = VALUES(banner),
        previewVideo = VALUES(previewVideo),
        gameUrl = VALUES(gameUrl),
        tags = VALUES(tags),
        rating = VALUES(rating),
        likes = VALUES(likes),
        dislikes = VALUES(dislikes),
        plays = VALUES(plays),
        featured = VALUES(featured),
        tileSize = VALUES(tileSize),
        status = VALUES(status),
        instructions = VALUES(instructions),
        width = VALUES(width),
        height = VALUES(height)
    `;

    await query(sql, [
      game.id,
      game.title || 'Untitled Game',
      game.category || 'arcade',
      game.description || '',
      game.thumbnail || '',
      game.banner || '',
      game.previewVideo || '',
      game.gameUrl || '',
      tagsJson,
      Number(game.rating || 4.8),
      Number(game.likes || 0),
      Number(game.dislikes || 0),
      Number(game.plays || 0),
      game.featured ? 1 : 0,
      game.tileSize || '1x1',
      game.status || 'active',
      game.instructions || '',
      Number(game.width) || 800,
      Number(game.height) || 600,
      game.createdAt || new Date().toISOString().split('T')[0]
    ]);

    return formatGame(game);
  },

  async findOneAndUpdate(filter, update, options = {}) {
    if (!isMySQLConnected()) return null;

    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (!rawId) return null;

    // Check if updating via $set or direct fields or $inc
    let updateFields = update.$set || { ...update };
    delete updateFields.$inc;
    delete updateFields.$set;

    const setClauses = [];
    const params = [];

    // Handle $inc if any
    if (update.$inc) {
      for (const [key, incVal] of Object.entries(update.$inc)) {
        setClauses.push(`\`${key}\` = COALESCE(\`${key}\`, 0) + ?`);
        params.push(Number(incVal));
      }
    }

    for (const [key, val] of Object.entries(updateFields)) {
      if (key === 'id') continue;
      if (key === 'tags') {
        setClauses.push('`tags` = ?');
        params.push(JSON.stringify(Array.isArray(val) ? val : []));
      } else if (key === 'featured') {
        setClauses.push('`featured` = ?');
        params.push(val ? 1 : 0);
      } else {
        setClauses.push(`\`${key}\` = ?`);
        params.push(val);
      }
    }

    if (setClauses.length > 0) {
      params.push(rawId);
      const sql = `UPDATE games SET ${setClauses.join(', ')} WHERE id = ?`;
      const result = await query(sql, params);

      if (result.affectedRows === 0 && options.upsert) {
        return await this.create({ id: rawId, ...updateFields });
      }
    }

    return await this.findOne({ id: rawId });
  },

  async deleteMany(filter = {}) {
    if (!isMySQLConnected()) return { affectedRows: 0 };

    if (!filter || Object.keys(filter).length === 0) {
      return await query('DELETE FROM games');
    }

    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (rawId) {
      return await query('DELETE FROM games WHERE id = ?', [rawId]);
    }

    return { affectedRows: 0 };
  },

  async insertMany(games) {
    if (!isMySQLConnected() || !Array.isArray(games)) return;
    for (const g of games) {
      await this.create(g);
    }
  },

  async updateMany(filter, update) {
    if (!isMySQLConnected()) return;
    const setFields = update.$set || update;
    const setClauses = [];
    const params = [];
    for (const [key, val] of Object.entries(setFields)) {
      setClauses.push(`\`${key}\` = ?`);
      params.push(val);
    }
    if (setClauses.length > 0) {
      await query(`UPDATE games SET ${setClauses.join(', ')}`, params);
    }
  }
};
