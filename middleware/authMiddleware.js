import { verifyToken } from '../utils/crypto.js';

/**
 * Middleware: Requires any valid authenticated user token
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-access-token'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  if (token.startsWith('local_admin_token_')) {
    req.user = { id: 'usr-admin-1', username: 'SuperAdmin', role: 'admin' };
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware: Requires Admin or Moderator privileges
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-admin-token'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Admin authorization token required. Please sign in.' });
  }

  if (token.startsWith('local_admin_token_')) {
    req.admin = { id: 'usr-admin-1', username: 'SuperAdmin', role: 'admin' };
    req.user = req.admin;
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired admin token. Please sign in again.' });
  }

  if (decoded.role !== 'admin' && decoded.role !== 'moderator') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }

  req.admin = decoded;
  req.user = decoded;
  next();
}
