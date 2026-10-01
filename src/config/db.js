import mysql from 'mysql';
import dotenv from 'dotenv';

dotenv.config();

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'nextgenn';
const MYSQL_PORT = Number(process.env.MYSQL_PORT) || 3306;

let pool = null;
let isConnected = false;

export function isMySQLConnected() {
  return isConnected && pool !== null;
}

export function getPool() {
  return pool;
}

export function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!pool) {
      return reject(new Error('MySQL pool is not initialized'));
    }
    pool.query(sql, params, (err, results, fields) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Ensure Database Exists before creating Pool
function ensureDatabaseExists() {
  return new Promise((resolve, reject) => {
    const tempConn = mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      port: MYSQL_PORT
    });

    tempConn.connect(err => {
      if (err) {
        return reject(err);
      }
      const createDbSql = `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
      tempConn.query(createDbSql, (qErr) => {
        tempConn.end();
        if (qErr) return reject(qErr);
        resolve();
      });
    });
  });
}

// Create all necessary schema tables
export async function createTables() {
  const gamesTable = `
    CREATE TABLE IF NOT EXISTS games (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT,
      thumbnail TEXT,
      banner TEXT,
      previewVideo TEXT,
      gameUrl TEXT,
      tags JSON,
      rating DECIMAL(3, 1) DEFAULT 4.8,
      likes INT DEFAULT 0,
      dislikes INT DEFAULT 0,
      plays INT DEFAULT 0,
      featured BOOLEAN DEFAULT FALSE,
      tileSize VARCHAR(20) DEFAULT '1x1',
      status VARCHAR(50) DEFAULT 'active',
      instructions TEXT,
      engine VARCHAR(100) DEFAULT 'HTML5',
      platform VARCHAR(100) DEFAULT 'Browser (Desktop, Mobile)',
      orientation VARCHAR(50) DEFAULT 'Landscape',
      developer VARCHAR(255) DEFAULT '',
      releaseDate VARCHAR(100) DEFAULT '',
      lastUpdate VARCHAR(100) DEFAULT '',
      relatedGames JSON,
      width INT DEFAULT 800,
      height INT DEFAULT 600,
      createdAt VARCHAR(50),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const categoriesTable = `
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      icon TEXT,
      image TEXT,
      color VARCHAR(50) DEFAULT '#00ffcc',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(100) PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      name VARCHAR(100),
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255),
      avatar TEXT,
      provider VARCHAR(50) DEFAULT 'email',
      passkeyCredentialId VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      status VARCHAR(50) DEFAULT 'active',
      cloudSave JSON,
      lastLogin VARCHAR(100),
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;


  const submissionsTable = `
    CREATE TABLE IF NOT EXISTS submissions (
      id VARCHAR(100) PRIMARY KEY,
      developerName VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL,
      gameTitle VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT 'arcade',
      gameUrl TEXT,
      thumbnailUrl TEXT,
      description TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      date VARCHAR(50),
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const messagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL,
      type VARCHAR(50) DEFAULT 'General',
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      date VARCHAR(50),
      \`read\` BOOLEAN DEFAULT FALSE,
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const blogPostsTable = `
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await query(gamesTable);
  await query(categoriesTable);
  await query(usersTable);
  await query(submissionsTable);
  await query(messagesTable);
  await query(blogPostsTable);

  try {
    // Clean up legacy game_scores and banner tables
    await query('DROP TABLE IF EXISTS game_scores');
    await query('DROP TABLE IF EXISTS banner');
    await query('DROP TABLE IF EXISTS banners');
  } catch (e) { }

  try {
    await query('ALTER TABLE users ADD COLUMN cloudSave JSON');
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    await query('ALTER TABLE games ADD COLUMN instructions TEXT');
  } catch (e) { }

  try {
    await query('ALTER TABLE games ADD COLUMN width INT DEFAULT 800');
  } catch (e) { }

  try {
    await query('ALTER TABLE games ADD COLUMN height INT DEFAULT 600');
  } catch (e) { }

  try {
    await query("ALTER TABLE games ADD COLUMN engine VARCHAR(100) DEFAULT 'HTML5'");
  } catch (e) { }

  try {
    await query("ALTER TABLE games ADD COLUMN platform VARCHAR(100) DEFAULT 'Browser (Desktop, Mobile)'");
  } catch (e) { }

  try {
    await query("ALTER TABLE games ADD COLUMN orientation VARCHAR(50) DEFAULT 'Landscape'");
  } catch (e) { }

  try {
    await query("ALTER TABLE games ADD COLUMN developer VARCHAR(255) DEFAULT ''");
  } catch (e) { }

  try {
    await query("ALTER TABLE games ADD COLUMN releaseDate VARCHAR(100) DEFAULT ''");
  } catch (e) { }

  try {
    await query("ALTER TABLE games ADD COLUMN lastUpdate VARCHAR(100) DEFAULT ''");
  } catch (e) { }

  try {
    await query("ALTER TABLE games ADD COLUMN relatedGames JSON");
  } catch (e) { }

  try {
    await query("ALTER TABLE games ADD COLUMN screenshots JSON");
  } catch (e) { }

  try {
    await query('ALTER TABLE games MODIFY COLUMN thumbnail LONGTEXT');
  } catch (e) { }

  try {
    await query('ALTER TABLE games MODIFY COLUMN banner LONGTEXT');
  } catch (e) { }

  try {
    // Automatic Masonry Gallery: Normalize legacy 3x2, 4x2, etc. tile sizes to 'auto'
    await query("UPDATE games SET tileSize = 'auto' WHERE tileSize IN ('3x2', '4x2', '2x3', '1x2')");
  } catch (e) { }

  try {
    await query('ALTER TABLE categories MODIFY COLUMN icon TEXT');
  } catch (e) { }

  try {
    await query('ALTER TABLE categories ADD COLUMN image TEXT');
  } catch (e) { }

  try {
    await query("UPDATE categories SET name = 'Adventure' WHERE (id = 'adventure' OR name = 'adventure') AND name != 'Adventure'");
  } catch (e) { }

  try {
    await query('ALTER TABLE blog_posts ADD COLUMN image LONGTEXT');
  } catch (e) { }

  try {
    await query('ALTER TABLE blog_posts ADD COLUMN category VARCHAR(100) DEFAULT "General"');
  } catch (e) { }

  try {
    await query('ALTER TABLE blog_posts ADD COLUMN gameUrl VARCHAR(500) DEFAULT ""');
  } catch (e) { }

  try {
    await query('ALTER TABLE blog_posts ADD COLUMN gameTitle VARCHAR(255) DEFAULT ""');
  } catch (e) { }

  try {
    await query("UPDATE blog_posts SET gameUrl = 'https://html5.gamemonetize.co/mb8kyh2eioqmmh42g3tw8tkk98yl6h7y/', gameTitle = 'Need for Race' WHERE id LIKE '%need-for-race%' AND (gameUrl = '' OR gameUrl IS NULL)");
  } catch (e) { }

  try {
    const { BlogPost } = await import('../models/BlogPost.js');
    await BlogPost.ensureTable();
  } catch (e) { }

  try {
    const rows = await query("SELECT COUNT(*) as count FROM games");
    console.log(`🎮 NextGenn Games Database Ready: ${rows[0]?.count || 0} total games in catalog.`);
  } catch (e) {
    console.warn('Game status check warning:', e.message);
  }
}

export async function connectDB() {
  try {
    // 1. Ensure database exists
    await ensureDatabaseExists();

    // 2. Initialize connection pool
    pool = mysql.createPool({
      connectionLimit: 10,
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      port: MYSQL_PORT,
      charset: 'utf8mb4',
      multipleStatements: true
    });

    // Test pool connection
    await query('SELECT 1');
    isConnected = true;
    console.log(`✅ Connected to MySQL database "${MYSQL_DATABASE}" at ${MYSQL_HOST}:${MYSQL_PORT}`);

    // 3. Create tables if not exist
    await createTables();

    // Optional: Initial stats reset (disabled to preserve production play metrics and user ratings)
    // await query('UPDATE games SET plays = 0, likes = 0, dislikes = 0').catch(() => {});
  } catch (err) {
    isConnected = false;
    console.error(`❌ MySQL connection failed (${err.message}). Ensure MySQL service is active.`);
  }
}
