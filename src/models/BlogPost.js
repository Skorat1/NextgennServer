import { query, isMySQLConnected } from '../config/db.js';

function formatDateString(dateVal) {
  if (!dateVal) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateVal);
  }
}

function formatPost(row) {
  if (!row) return null;
  const createdAt = row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString();

  return {
    ...row,
    tags: (() => {
      if (!row.tags) return [];
      if (Array.isArray(row.tags)) return row.tags;
      try { return JSON.parse(row.tags); }
      catch { return String(row.tags).split(',').map(t => t.trim()).filter(Boolean); }
    })(),
    category: row.category || 'General',
    image: row.image || '',
    published: Boolean(row.published === 1 || row.published === true || row.published === '1' || row.published === 'true'),
    featured: Boolean(row.featured === 1 || row.featured === true || row.featured === '1' || row.featured === 'true'),
    views: Number(row.views || 0),
    readTime: row.readTime || '3 min read',
    createdAt,
    date: row.date || formatDateString(createdAt),
    gameUrl: row.gameUrl || '',
    gameTitle: row.gameTitle || ''
  };
}

export const BlogPost = {
  async ensureTable() {
    if (!isMySQLConnected()) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS blog_posts (
          id VARCHAR(100) PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          excerpt TEXT,
          content LONGTEXT,
          category VARCHAR(100) DEFAULT 'General',
          author VARCHAR(200) DEFAULT 'NextGenn Editorial',
          tags LONGTEXT,
          gradient VARCHAR(200) DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          image LONGTEXT,
          emoji VARCHAR(10) DEFAULT '🎮',
          gameUrl VARCHAR(500) DEFAULT '',
          gameTitle VARCHAR(255) DEFAULT '',
          published TINYINT(1) DEFAULT 1,
          featured TINYINT(1) DEFAULT 0,
          views INT DEFAULT 0,
          readTime VARCHAR(50) DEFAULT '3 min read',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      try { await query('ALTER TABLE blog_posts ADD COLUMN image LONGTEXT'); } catch {}
      try { await query('ALTER TABLE blog_posts MODIFY COLUMN image LONGTEXT'); } catch {}
      try { await query('ALTER TABLE blog_posts ADD COLUMN category VARCHAR(100) DEFAULT "General"'); } catch {}
      try { await query('ALTER TABLE blog_posts MODIFY COLUMN content LONGTEXT'); } catch {}
      try { await query('ALTER TABLE blog_posts MODIFY COLUMN tags LONGTEXT'); } catch {}
      try { await query('ALTER TABLE blog_posts ADD COLUMN gameUrl VARCHAR(500) DEFAULT ""'); } catch {}
      try { await query('ALTER TABLE blog_posts ADD COLUMN gameTitle VARCHAR(255) DEFAULT ""'); } catch {}
      try { await query('ALTER TABLE blog_posts ADD COLUMN emoji VARCHAR(10) DEFAULT "🎮"'); } catch {}
    } catch (err) {
      console.warn('BlogPost.ensureTable warning:', err.message);
    }
  },

  async countDocuments() {
    if (!isMySQLConnected()) return 0;
    try {
      const rows = await query('SELECT COUNT(*) AS count FROM blog_posts');
      return rows[0]?.count || 0;
    } catch {
      return 0;
    }
  },

  async find(filter = {}) {
    if (!isMySQLConnected()) return [];
    try {
      await this.ensureTable();
      let sql = 'SELECT * FROM blog_posts WHERE 1=1';
      const params = [];

      if (filter.published === true || filter.published === 'true') {
        sql += ' AND (published = 1 OR published IS NULL)';
      } else if (filter.published === false || filter.published === 'false') {
        sql += ' AND published = 0';
      }

      if (filter.featured === true || filter.featured === 'true') {
        sql += ' AND (featured = 1)';
      }

      if (filter.category && filter.category !== 'all') {
        sql += ' AND LOWER(category) = LOWER(?)';
        params.push(filter.category.trim());
      }

      if (filter.search) {
        sql += ' AND (LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(tags) LIKE ?)';
        const term = `%${String(filter.search).toLowerCase()}%`;
        params.push(term, term, term);
      }

      sql += ' ORDER BY featured DESC, createdAt DESC';
      if (filter.limit) sql += ` LIMIT ${Number(filter.limit)}`;

      const rows = await query(sql, params);
      return Array.isArray(rows) ? rows.map(formatPost) : [];
    } catch (err) {
      console.error('MySQL BlogPost.find error:', err.message);
      return [];
    }
  },

  async findOne(filter = {}) {
    if (!isMySQLConnected()) return null;
    try {
      let sql = 'SELECT * FROM blog_posts WHERE 1=1';
      const params = [];

      const targetId = filter.id || filter._id;
      if (targetId) {
        sql += ' AND id = ? LIMIT 1';
        params.push(targetId);
      } else {
        return null;
      }

      const rows = await query(sql, params);
      return rows && rows.length > 0 ? formatPost(rows[0]) : null;
    } catch (err) {
      console.error('MySQL BlogPost.findOne error:', err.message);
      return null;
    }
  },

  async create(data) {
    const post = { ...data };
    if (!post.id) {
      post.id = (post.title || 'post')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50) + '-' + Date.now().toString().slice(-5);
    }

    const isPublished = (post.published === true || post.published === 1 || post.published === 'true' || post.published === undefined);
    const isFeatured = (post.featured === true || post.featured === 1 || post.featured === 'true');
    const tagsArray = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
    const tagsJson = JSON.stringify(tagsArray);

    await this.ensureTable();
    await query(`
      INSERT INTO blog_posts (
        id, title, excerpt, content, category, author, tags,
        gradient, image, emoji, gameUrl, gameTitle, published,
        featured, views, readTime, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        excerpt = VALUES(excerpt),
        content = VALUES(content),
        category = VALUES(category),
        author = VALUES(author),
        tags = VALUES(tags),
        gradient = VALUES(gradient),
        image = VALUES(image),
        emoji = VALUES(emoji),
        gameUrl = VALUES(gameUrl),
        gameTitle = VALUES(gameTitle),
        published = VALUES(published),
        featured = VALUES(featured),
        readTime = VALUES(readTime)
    `, [
      post.id,
      post.title || 'Untitled Post',
      post.excerpt || '',
      post.content || '',
      post.category || 'General',
      post.author || 'NextGenn Editorial',
      tagsJson,
      post.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      post.image || '',
      post.emoji || '🎮',
      post.gameUrl || '',
      post.gameTitle || '',
      isPublished ? 1 : 0,
      isFeatured ? 1 : 0,
      Number(post.views || 0),
      post.readTime || '3 min read'
    ]);

    return await this.findOne({ id: post.id });
  },

  async update(id, data) {
    if (!isMySQLConnected()) return null;
    await this.ensureTable();

    const isPublished = data.published !== undefined ? Boolean(data.published === true || data.published === 1 || data.published === 'true') : undefined;
    const isFeatured = data.featured !== undefined ? Boolean(data.featured === true || data.featured === 1 || data.featured === 'true') : undefined;

    const setClauses = [];
    const params = [];
    const allowed = ['title', 'excerpt', 'content', 'category', 'author', 'gradient', 'image', 'emoji', 'readTime', 'gameUrl', 'gameTitle'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        setClauses.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }

    if (data.tags !== undefined) {
      setClauses.push('`tags` = ?');
      params.push(JSON.stringify(Array.isArray(data.tags) ? data.tags : []));
    }

    if (isPublished !== undefined) {
      setClauses.push('`published` = ?');
      params.push(isPublished ? 1 : 0);
    }

    if (isFeatured !== undefined) {
      setClauses.push('`featured` = ?');
      params.push(isFeatured ? 1 : 0);
    }

    if (setClauses.length > 0) {
      setClauses.push('updatedAt = NOW()');
      params.push(id);
      await query(`UPDATE blog_posts SET ${setClauses.join(', ')} WHERE id = ?`, params);
    }

    return await this.findOne({ id });
  },

  async delete(id) {
    if (!isMySQLConnected()) return;
    await query('DELETE FROM blog_posts WHERE id = ?', [id]);
  },

  async incrementViews(id) {
    if (!isMySQLConnected()) return;
    try {
      await query('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [id]);
    } catch {}
  }
};
