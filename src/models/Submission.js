import { query, isMySQLConnected } from '../config/db.js';

export const Submission = {
  async countDocuments() {
    if (!isMySQLConnected()) return 0;
    const rows = await query('SELECT COUNT(*) AS count FROM submissions');
    return rows[0]?.count || 0;
  },

  async find() {
    if (!isMySQLConnected()) return [];
    return await query('SELECT * FROM submissions ORDER BY createdAt DESC, id DESC');
  },

  async findOne(filter = {}) {
    if (!isMySQLConnected()) return null;
    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (rawId) {
      const rows = await query('SELECT * FROM submissions WHERE id = ? LIMIT 1', [rawId]);
      return rows[0] || null;
    }
    return null;
  },

  async create(data) {
    if (!isMySQLConnected()) return data;
    const sql = `
      INSERT INTO submissions (id, developerName, email, gameTitle, category, gameUrl, thumbnailUrl, description, status, date, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;
    await query(sql, [
      data.id || 'sub-' + Date.now().toString().slice(-6),
      data.developerName || '',
      data.email || '',
      data.gameTitle || '',
      data.category || 'arcade',
      data.gameUrl || '',
      data.thumbnailUrl || '',
      data.description || '',
      data.status || 'pending',
      data.date || new Date().toISOString().split('T')[0],
      data.createdAt || new Date().toISOString()
    ]);
    return data;
  },

  async findOneAndUpdate(filter, update, options = {}) {
    if (!isMySQLConnected()) return null;
    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (!rawId) return null;

    const data = update.$set || update;
    const setClauses = [];
    const params = [];

    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id') {
        setClauses.push(`\`${key}\` = ?`);
        params.push(val);
      }
    }

    if (setClauses.length > 0) {
      params.push(rawId);
      const res = await query(`UPDATE submissions SET ${setClauses.join(', ')} WHERE id = ?`, params);
      if (res.affectedRows === 0 && options.upsert) {
        return await this.create({ id: rawId, ...data });
      }
    }

    return await this.findOne({ id: rawId });
  },

  async deleteMany(filter = {}) {
    if (!isMySQLConnected()) return { affectedRows: 0 };
    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (rawId) {
      return await query('DELETE FROM submissions WHERE id = ?', [rawId]);
    }
    return { affectedRows: 0 };
  }
};
