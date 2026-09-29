import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
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

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving (blog images, banners, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

  const server = httpServer.listen(PORT, () => {
    console.log(`🚀 NextGenn Backend Engine running at http://localhost:${PORT}`);
  });

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
