/**
 * 404 Not Found Middleware
 * Intercepts requests to undefined routes and returns a JSON response
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: [${req.method}] ${req.originalUrl}`
  });
};
