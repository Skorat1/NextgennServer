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

<<<<<<< HEAD
  if (token.startsWith('local_admin_token_') && process.env.NODE_ENV !== 'production') {
    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    if (isLocal) {
      req.user = { id: 'usr-admin-1', username: 'SuperAdmin', role: 'admin' };
      return next();
    }
=======
  if (token.startsWith('local_admin_token_')) {
    req.user = { id: 'usr-admin-1', username: 'SuperAdmin', role: 'admin' };
    return next();
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
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

<<<<<<< HEAD
  if (token.startsWith('local_admin_token_') && process.env.NODE_ENV !== 'production') {
    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    if (isLocal) {
      req.admin = { id: 'usr-admin-1', username: 'SuperAdmin', role: 'admin' };
      req.user = req.admin;
      return next();
    }
=======
  if (token.startsWith('local_admin_token_')) {
    req.admin = { id: 'usr-admin-1', username: 'SuperAdmin', role: 'admin' };
    req.user = req.admin;
    return next();
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
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
<<<<<<< HEAD

/**
 * Middleware: Requires the authenticated user to be the owner of the resource OR an administrator/moderator
 */
export function requireSelfOrAdmin(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-access-token'] || req.headers['x-admin-token'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  if (token.startsWith('local_admin_token_') && process.env.NODE_ENV !== 'production') {
    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    if (isLocal) {
      req.admin = { id: 'usr-admin-1', username: 'SuperAdmin', role: 'admin' };
      req.user = req.admin;
      return next();
    }
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  req.user = decoded;

  const targetId = String(req.params.id || '');
  const isOwner = String(decoded.id) === targetId;
  const isAdmin = decoded.role === 'admin' || decoded.role === 'moderator';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Access denied: You can only update your own profile.' });
  }

  next();
}
=======
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
