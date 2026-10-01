import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
<<<<<<< HEAD
=======
import http from 'http';
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getPool } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import proxyRoutes from './routes/proxyRoutes.js';
import { 
  generateSitemapXml, 
  generateSubSitemapXml, 
  generateSitemapXsl, 
  generateRobotsTxt 
} from './controllers/sitemapController.js';
import { handleGamePrerender } from './middleware/crawlerPrerender.js';

// Load environment variables
dotenv.config();

<<<<<<< HEAD
// Silence standard console logs in production (keeps console.error for critical server issues)
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

const app = express();
=======
const app = express();
const httpServer = http.createServer(app);
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620

const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving (blog images, banners, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Dynamic SEO Sitemap and Robots.txt for Search Engines
app.get('/sitemap.xml', generateSitemapXml);
app.get('/sitemap.xsl', generateSitemapXsl);
app.get('/sitemap-:type.xml', generateSubSitemapXml);
app.get('/api/sitemap.xml', generateSitemapXml);
app.get('/robots.txt', generateRobotsTxt);

// Social Bots & Crawler Pre-rendering (WhatsApp, Facebook, Twitter, Googlebot)
app.get('/game/:id', handleGamePrerender);

// Root Route & Health Check
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'NextGenn API Engine',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Game Embed Proxy
app.use('/game-proxy', proxyRoutes);

<<<<<<< HEAD
// Block search engine indexing and crawlers for all admin endpoints
app.use(['/admin', '/api/admin'], (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});

=======
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
// Main API Endpoints with Rate Limiting
app.use('/api', apiLimiter, apiRoutes);

// 404 Catch-All Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Start Server and Connect Database
const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('⚠️ Database initialization warning:', err.message);
  }

<<<<<<< HEAD
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NextGenn Backend Engine running at http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use by another process.`);
      console.error(`👉 To free it, run: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
      process.exit(1);
    } else {
      console.error('💥 Server error:', err.message);
    }
  });

=======
  const server = httpServer.listen(PORT, () => {
    console.log(`🚀 NextGenn Backend Engine running at http://localhost:${PORT}`);
  });

>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
  // Graceful Shutdown Handlers
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
    server.close(() => {
      console.log('🔒 HTTP server closed.');
      const pool = getPool();
      if (pool) {
        pool.end((err) => {
          if (err) console.error('Error closing MySQL pool:', err.message);
          else console.log('🔒 MySQL connection pool closed.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });

    // Force shutdown if taking too long
    setTimeout(() => {
      console.error('⚠️ Forcefully terminating after timeout');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

startServer();
// NextGenn API Server - Blog Game Link Support Ready
