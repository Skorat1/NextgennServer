import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, isMySQLConnected } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../data/blog_posts.json');

// Initial default seed posts in case database is completely empty
const INITIAL_SEED_POSTS = [
  {
    id: 'post-welcome-to-nextgenn',
    title: 'Welcome to NextGenn: The Ultimate Browser Gaming Platform',
    excerpt: 'Explore hundreds of high-octane instant browser games with zero downloads, lightning-fast loading, and premium action.',
    content: `## Welcome to the Future of Instant Play

NextGenn is built from the ground up for passionate gamers who want **zero installation lag**, immediate gameplay, and cross-device smoothness.

### Why Choose Browser Gaming in 2026?

Modern web technologies like **WebGL** and **WebAssembly** allow console-grade responsiveness directly in your browser. Whether you're on a Chromebook, high-end PC, or mobile smartphone, our entire game catalog runs at 60+ FPS effortlessly.

- 🎮 **Instant Action**: No hefty 50GB downloads or waiting for patches.
- ⚡ **Cross-Platform Sync**: Play smoothly across desktop, tablet, and mobile.
- 🏆 **Community & Tournaments**: Climb global leaderboards and challenge friends in real-time.

Stay tuned to our blog for weekly game releases, developer spotlights, and expert gameplay strategies!`,
    author: 'NextGenn Editorial',
    tags: ['Gaming', 'Platform', 'Updates', 'Browser Games'],
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    image: '',
    published: true,
    featured: true,
    views: 1420,
    readTime: '3 min read',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'post-top-10-retro-arcade-games',
    title: 'Top 10 Retro Arcade Classics Reimagined for the Modern Web',
    excerpt: 'From pixel-perfect space shooters to intense labyrinth escapes, discover why classic arcade mechanics are dominating web leaderboards.',
    content: `## The Timeless Appeal of Arcade Gameplay

There is something irreplaceable about retro arcade mechanics: **easy to learn, brutally difficult to master, and irresistibly replayable**.

### What Makes a Great Arcade Game?

1. **Precision Controls**: Immediate feedback with zero input latency.
2. **Exponential Difficulty Curve**: Gentle beginnings ramping up to pure sensory overload.
3. **High Score Culture**: Competing against yourself and players across the globe.

Check out our dedicated Arcade category in the navigation menu to jump right into the classics today!`,
    author: 'Alex Vance',
    tags: ['Retro', 'Arcade', 'Guides', 'Top 10'],
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    image: '',
    published: true,
    featured: false,
    views: 890,
    readTime: '4 min read',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

function readDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_SEED_POSTS, null, 2), 'utf8');
      return [...INITIAL_SEED_POSTS];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading blog_posts.json fallback:', e.message);
    return [...INITIAL_SEED_POSTS];
  }
}

function writeDataFile(posts) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing blog_posts.json fallback:', e.message);
  }
}

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
  const createdAt = row.createdAt || new Date().toISOString();
  return {
    ...row,
    tags: (() => {
      if (!row.tags) return [];
      if (Array.isArray(row.tags)) return row.tags;
      try { return JSON.parse(row.tags); }
      catch { return String(row.tags).split(',').map(t => t.trim()).filter(Boolean); }
    })(),
    published: Boolean(row.published === 1 || row.published === true || row.published === '1' || row.published === 'true'),
    featured: Boolean(row.featured === 1 || row.featured === true || row.featured === '1' || row.featured === 'true'),
    views: Number(row.views || 0),
    readTime: row.readTime || '3 min read',
    createdAt,
    date: row.date || formatDateString(createdAt)
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
          author VARCHAR(200) DEFAULT 'NextGenn Editorial',
          tags LONGTEXT,
          gradient VARCHAR(200) DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          image LONGTEXT,
          published TINYINT(1) DEFAULT 1,
          featured TINYINT(1) DEFAULT 0,
          views INT DEFAULT 0,
          readTime VARCHAR(50) DEFAULT '3 min read',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      try { await query('ALTER TABLE blog_posts MODIFY COLUMN image LONGTEXT'); } catch {}
      try { await query('ALTER TABLE blog_posts MODIFY COLUMN content LONGTEXT'); } catch {}
      try { await query('ALTER TABLE blog_posts MODIFY COLUMN tags LONGTEXT'); } catch {}

      // Seed if table is empty
      const rows = await query('SELECT COUNT(*) AS count FROM blog_posts');
      if (rows && rows[0]?.count === 0) {
        const filePosts = readDataFile();
        const toSeed = filePosts.length > 0 ? filePosts : INITIAL_SEED_POSTS;
        for (const p of toSeed) {
          const tagsJson = JSON.stringify(Array.isArray(p.tags) ? p.tags : []);
          await query(`
            INSERT INTO blog_posts (id, title, excerpt, content, author, tags, gradient, image, published, featured, views, readTime, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE title = VALUES(title)
          `, [
            p.id,
            p.title,
            p.excerpt || '',
            p.content || '',
            p.author || 'NextGenn Editorial',
            tagsJson,
            p.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p.image || '',
            p.published ? 1 : 0,
            p.featured ? 1 : 0,
            Number(p.views || 0),
            p.readTime || '3 min read'
          ]).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('BlogPost.ensureTable warning:', err.message);
    }
  },

  async countDocuments() {
    if (!isMySQLConnected()) {
      const posts = readDataFile();
      return posts.length;
    }
    try {
      const rows = await query('SELECT COUNT(*) AS count FROM blog_posts');
      return rows[0]?.count || 0;
    } catch {
      return readDataFile().length;
    }
  },

  async find(filter = {}) {
    let results = [];
    if (isMySQLConnected()) {
      try {
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

        if (filter.search) {
          sql += ' AND (LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(tags) LIKE ?)';
          const term = `%${String(filter.search).toLowerCase()}%`;
          params.push(term, term, term);
        }

        sql += ' ORDER BY featured DESC, createdAt DESC';
        if (filter.limit) sql += ` LIMIT ${Number(filter.limit)}`;

        const rows = await query(sql, params);
        if (Array.isArray(rows) && rows.length > 0) {
          results = rows.map(formatPost);
        }
      } catch (err) {
        console.warn('MySQL BlogPost.find fallback to file storage:', err.message);
      }
    }

    // Fallback or supplementary sync with JSON persistent storage
    if (results.length === 0) {
      const filePosts = readDataFile().map(formatPost);
      results = filePosts.filter(p => {
        if (filter.published === true && !p.published) return false;
        if (filter.published === false && p.published) return false;
        if ((filter.featured === true || filter.featured === 'true') && !p.featured) return false;
        if (filter.search) {
          const q = String(filter.search).toLowerCase();
          const matchTitle = p.title?.toLowerCase().includes(q);
          const matchExcerpt = p.excerpt?.toLowerCase().includes(q);
          const matchTags = Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q));
          if (!matchTitle && !matchExcerpt && !matchTags) return false;
        }
        return true;
      });
      results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      if (filter.limit) results = results.slice(0, Number(filter.limit));
    }

    return results;
  },

  async findOne(filter = {}) {
    if (isMySQLConnected() && filter.id) {
      try {
        const rows = await query('SELECT * FROM blog_posts WHERE id = ? LIMIT 1', [filter.id]);
        if (rows && rows.length > 0) return formatPost(rows[0]);
      } catch {}
    }
    const filePosts = readDataFile();
    const found = filePosts.find(p => p.id === filter.id);
    return found ? formatPost(found) : null;
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
    const createdAt = post.createdAt || new Date().toISOString();

    const formatted = formatPost({
      ...post,
      tags: tagsArray,
      published: isPublished,
      featured: isFeatured,
      views: Number(post.views || 0),
      readTime: post.readTime || '3 min read',
      createdAt
    });

    // 1. Persist to MySQL
    if (isMySQLConnected()) {
      try {
        await this.ensureTable();
        await query(`
          INSERT INTO blog_posts (id, title, excerpt, content, author, tags, gradient, image, published, featured, views, readTime, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          formatted.id,
          formatted.title || 'Untitled Post',
          formatted.excerpt || '',
          formatted.content || '',
          formatted.author || 'NextGenn Editorial',
          tagsJson,
          formatted.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          formatted.image || '',
          isPublished ? 1 : 0,
          isFeatured ? 1 : 0,
          Number(formatted.views || 0),
          formatted.readTime || '3 min read'
        ]);
      } catch (err) {
        console.error('MySQL insert error in BlogPost.create:', err.message);
      }
    }

    // 2. Persist to persistent JSON file backup
    try {
      const filePosts = readDataFile();
      const updatedList = [formatted, ...filePosts.filter(p => p.id !== formatted.id)];
      writeDataFile(updatedList);
    } catch (err) {
      console.error('JSON file backup write error:', err.message);
    }

    return formatted;
  },

  async update(id, data) {
    const isPublished = data.published !== undefined ? Boolean(data.published === true || data.published === 1 || data.published === 'true') : undefined;
    const isFeatured = data.featured !== undefined ? Boolean(data.featured === true || data.featured === 1 || data.featured === 'true') : undefined;

    // 1. Update MySQL
    if (isMySQLConnected()) {
      try {
        const setClauses = [];
        const params = [];
        const allowed = ['title', 'excerpt', 'content', 'author', 'gradient', 'image', 'readTime'];
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
      } catch (err) {
        console.warn('MySQL update warning in BlogPost.update:', err.message);
      }
    }

    // 2. Update JSON file
    try {
      const filePosts = readDataFile();
      const idx = filePosts.findIndex(p => p.id === id);
      let updatedObj = null;
      if (idx !== -1) {
        filePosts[idx] = {
          ...filePosts[idx],
          ...data,
          ...(isPublished !== undefined ? { published: isPublished } : {}),
          ...(isFeatured !== undefined ? { featured: isFeatured } : {}),
          updatedAt: new Date().toISOString()
        };
        updatedObj = formatPost(filePosts[idx]);
        writeDataFile(filePosts);
      }
      return updatedObj || this.findOne({ id });
    } catch {
      return this.findOne({ id });
    }
  },

  async delete(id) {
    if (isMySQLConnected()) {
      try {
        await query('DELETE FROM blog_posts WHERE id = ?', [id]);
      } catch (err) {
        console.warn('MySQL delete warning in BlogPost.delete:', err.message);
      }
    }
    try {
      const filePosts = readDataFile();
      const filtered = filePosts.filter(p => p.id !== id);
      writeDataFile(filtered);
    } catch (err) {
      console.warn('JSON file delete warning in BlogPost.delete:', err.message);
    }
  },

  async incrementViews(id) {
    if (isMySQLConnected()) {
      try {
        await query('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [id]);
      } catch {}
    }
    try {
      const filePosts = readDataFile();
      const p = filePosts.find(x => x.id === id);
      if (p) {
        p.views = (p.views || 0) + 1;
        writeDataFile(filePosts);
      }
    } catch {}
  }
};
