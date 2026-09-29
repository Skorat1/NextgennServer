import { query, isMySQLConnected } from '../config/db.js';

function formatUser(row) {
  if (!row) return null;
  let cloudSave = row.cloudSave;
  if (typeof cloudSave === 'string') {
    try { cloudSave = JSON.parse(cloudSave); } catch { cloudSave = null; }
  }
  return {
    ...row,
    cloudSave: cloudSave || null,
    createdAt: row.createdAt || (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()),
    lastLogin: row.lastLogin || (row.last_login ? new Date(row.last_login).toISOString() : new Date().toISOString())
  };
}

export const User = {
  async countDocuments() {
    if (!isMySQLConnected()) return 0;
    const rows = await query('SELECT COUNT(*) AS count FROM users');
    return rows[0]?.count || 0;
  },

  async find(filter = {}) {
    if (!isMySQLConnected()) return [];
    const rows = await query('SELECT * FROM users ORDER BY createdAt DESC');
    return rows.map(formatUser);
  },

  async findOne(filter = {}) {
    if (!isMySQLConnected()) return null;

    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (filter.email && !filter.$or) {
      sql += ' AND LOWER(email) = LOWER(?)';
      params.push(filter.email.trim());
    } else if (filter.id && !filter.$or) {
      sql += ' AND id = ?';
      params.push(filter.id);
    } else if (filter.$or && Array.isArray(filter.$or)) {
      const orClauses = [];
      for (const cond of filter.$or) {
        if (cond.id) {
          orClauses.push('id = ?');
          params.push(cond.id);
        } else if (cond._id && typeof cond._id === 'string') {
          orClauses.push('id = ?');
          params.push(cond._id);
        } else if (cond.email) {
          orClauses.push('LOWER(email) = LOWER(?)');
          params.push(cond.email.trim());
        } else if (cond.username) {
          orClauses.push('LOWER(username) = LOWER(?)');
          const uname = cond.username instanceof RegExp
            ? cond.username.source.replace(/^\^|\$$/g, '')
            : cond.username;
          params.push(uname.trim());
        }
      }
      if (orClauses.length > 0) {
        sql += ` AND (${orClauses.join(' OR ')})`;
      }
    }

    sql += ' LIMIT 1';
    const rows = await query(sql, params);
    return rows.length > 0 ? formatUser(rows[0]) : null;
  },

  async create(user) {
    if (!isMySQLConnected()) return user;

    const sql = `
      INSERT INTO users (id, username, name, email, password, avatar, provider, passkeyCredentialId, role, status, cloudSave, lastLogin, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        name = VALUES(name),
        password = VALUES(password),
        avatar = VALUES(avatar),
        role = VALUES(role),
        status = VALUES(status),
        cloudSave = VALUES(cloudSave),
        lastLogin = VALUES(lastLogin)
    `;

    const cloudSaveVal = user.cloudSave
      ? (typeof user.cloudSave === 'object' ? JSON.stringify(user.cloudSave) : user.cloudSave)
      : null;

    await query(sql, [
      user.id,
      user.username,
      user.name || user.username,
      user.email,
      user.password || '',
      user.avatar || '',
      user.provider || 'email',
      user.passkeyCredentialId || null,
      user.role || 'moderator',
      user.status || 'active',
      cloudSaveVal,
      user.lastLogin || new Date().toISOString(),
      user.createdAt || new Date().toISOString()
    ]);

    return formatUser(user);
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
        params.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      }
    }

    if (setClauses.length > 0) {
      params.push(rawId);
      const res = await query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, params);
      if (res.affectedRows === 0 && options.upsert) {
        return await this.create({ id: rawId, ...data });
      }
    }

    return await this.findOne({ id: rawId });
  },

  async findByIdAndUpdate(id, update, options = {}) {
    return await this.findOneAndUpdate({ id }, update, options);
  },

  async deleteMany(filter = {}) {
    if (!isMySQLConnected()) return { affectedRows: 0 };
    const rawId = filter.id || (filter.$or && (filter.$or[0]?.id || filter.$or[1]?._id));
    if (rawId) {
      return await query('DELETE FROM users WHERE id = ?', [rawId]);
    }
    return { affectedRows: 0 };
  },

  async insertMany(users) {
    if (!isMySQLConnected() || !Array.isArray(users)) return;
    for (const u of users) {
      await this.create(u);
    }
  }
};
