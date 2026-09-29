import { query, isMySQLConnected } from '../config/db.js';

export const Category = {
  async countDocuments() {
    if (!isMySQLConnected()) return 0;
    const rows = await query('SELECT COUNT(*) AS count FROM categories');
    return rows[0]?.count || 0;
  },

  async find() {
    if (!isMySQLConnected()) return [];
    return await query('SELECT * FROM categories ORDER BY name ASC');
  },

  async findOne(filter = {}) {
    if (!isMySQLConnected()) return null;
    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (rawId) {
      const rows = await query('SELECT * FROM categories WHERE id = ? LIMIT 1', [rawId]);
      return rows[0] || null;
    }
    if (filter.name) {
      const rows = await query('SELECT * FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1', [filter.name]);
      return rows[0] || null;
    }
    return null;
  },

  async create(cat) {
    if (!isMySQLConnected()) return cat;
    const catImage = cat.image || cat.icon || '';
    const sql = `
      INSERT INTO categories (id, name, icon, image, color)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon), image = VALUES(image), color = VALUES(color)
    `;
    await query(sql, [cat.id, cat.name, cat.icon || catImage || cat.id, catImage, cat.color || '#3b82f6']);
    return cat;
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
      const res = await query(`UPDATE categories SET ${setClauses.join(', ')} WHERE id = ?`, params);
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
      return await query('DELETE FROM categories WHERE id = ?', [rawId]);
    }
    return { affectedRows: 0 };
  },

  async insertMany(categories) {
    if (!isMySQLConnected() || !Array.isArray(categories)) return;
    for (const c of categories) {
      await this.create(c);
    }
  }
};
