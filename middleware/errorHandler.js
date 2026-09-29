/**
 * Global Error Handling Middleware
 * Catches all unhandled errors, logs them, and responds with consistent JSON
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`❌ [Error] [${req.method}] ${req.originalUrl}:`, err.stack || err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
