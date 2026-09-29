import { query, isMySQLConnected } from '../config/db.js';

function formatMessage(row) {
  if (!row) return null;
  return {
    ...row,
    read: Boolean(row.read === 1 || row.read === true)
  };
}

export const Message = {
  async countDocuments() {
    if (!isMySQLConnected()) return 0;
    const rows = await query('SELECT COUNT(*) AS count FROM messages');
    return rows[0]?.count || 0;
  },

  async find() {
    if (!isMySQLConnected()) return [];
    const rows = await query('SELECT * FROM messages ORDER BY createdAt DESC, id DESC');
    return rows.map(formatMessage);
  },

  async findOne(filter = {}) {
    if (!isMySQLConnected()) return null;
    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (rawId) {
      const rows = await query('SELECT * FROM messages WHERE id = ? LIMIT 1', [rawId]);
      return rows.length > 0 ? formatMessage(rows[0]) : null;
    }
    return null;
  },

  async create(data) {
    if (!isMySQLConnected()) return data;
    const sql = `
      INSERT INTO messages (id, name, email, type, subject, message, date, \`read\`, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      data.id || 'msg-' + Date.now().toString().slice(-6),
      data.name || '',
      data.email || '',
      data.type || 'General',
      data.subject || '',
      data.message || '',
      data.date || new Date().toISOString().replace('T', ' ').slice(0, 16),
      data.read ? 1 : 0,
      data.createdAt || new Date().toISOString()
    ]);
    return formatMessage(data);
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
        if (key === 'read') {
          setClauses.push('`read` = ?');
          params.push(val ? 1 : 0);
        } else {
          setClauses.push(`\`${key}\` = ?`);
          params.push(val);
        }
      }
    }

    if (setClauses.length > 0) {
      params.push(rawId);
      const res = await query(`UPDATE messages SET ${setClauses.join(', ')} WHERE id = ?`, params);
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
      return await query('DELETE FROM messages WHERE id = ?', [rawId]);
    }
    return { affectedRows: 0 };
  },

  async markAllAsRead() {
    if (!isMySQLConnected()) return { affectedRows: 0 };
    return await query('UPDATE messages SET `read` = 1');
  }
};
