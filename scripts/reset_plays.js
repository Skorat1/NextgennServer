import mysql from 'mysql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function resetPlays() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'nextgenn';
  const port = Number(process.env.MYSQL_PORT) || 3306;

  const conn = mysql.createConnection({ host, user, password, database, port });
  conn.connect(err => {
    if (err) {
      console.error('❌ MySQL Connection Error:', err.message);
      process.exit(1);
    } else {
      console.log('✅ Connected to MySQL database');
      conn.query('UPDATE games SET plays = 0, likes = 0, dislikes = 0', (qErr, result) => {
        if (qErr) {
          console.error('❌ MySQL update error:', qErr.message);
        } else {
          console.log(`✅ MySQL: Reset plays, likes, and dislikes to 0 for ${result.affectedRows} games.`);
        }
        conn.end(() => {
          process.exit(qErr ? 1 : 0);
        });
      });
    }
  });
}

resetPlays();
