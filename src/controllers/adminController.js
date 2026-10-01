import { User } from '../models/User.js';
import { signToken, verifyPassword, hashPassword } from '../utils/crypto.js';
import { sanitizeUser } from '../utils/sanitize.js';

/**
 * Admin Login Endpoint
 * POST /api/admin/login
 */
export async function loginAdmin(req, res) {
  try {
    const { identifier, email, password } = req.body;
    const loginIdent = String(identifier || email || '').toLowerCase().trim();
    const loginPass = String(password || '').trim();

    if (!loginIdent || !loginPass) {
      return res.status(400).json({ error: 'Admin Email/Username and Password are required.' });
    }

    // 1. Check SuperAdmin credentials from environment configuration
    const envAdminUser = (process.env.ADMIN_IDENTIFIER || process.env.ADMIN_USER || 'admin').toLowerCase();
    const envAdminPass = process.env.ADMIN_PASSWORD;

    const isMasterAdmin =
      Boolean(envAdminPass && loginIdent === envAdminUser && loginPass === envAdminPass);

    // 2. Lookup in MySQL Database
    let adminUser = await User.findOne({
      $or: [
        { email: loginIdent },
        { username: loginIdent }
      ]
    });

    // If master admin used but not in DB yet, create in MySQL
    if (!adminUser && isMasterAdmin) {
      adminUser = {
        id: 'usr-admin-1',
        username: 'Admin',
        name: 'Administrator',
        email: process.env.ADMIN_EMAIL || `${loginIdent}@nextgenn.local`,
        password: hashPassword(loginPass),
        role: 'admin',
        status: 'active',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      await User.create(adminUser);
    }

    if (!adminUser) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    // Force admin role if master credentials used
    if (isMasterAdmin) {
      adminUser.role = 'admin';
    }

    // 3. Verify admin role
    if (adminUser.role !== 'admin' && adminUser.role !== 'moderator') {
      return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
    }

    // 4. Verify password (unless validated via master password)
    if (!isMasterAdmin) {
      const isPasswordValid = verifyPassword(loginPass, adminUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      }
    }

    // 5. Update lastLogin
    const nowIso = new Date().toISOString();
    await User.findOneAndUpdate({ id: adminUser.id }, { $set: { lastLogin: nowIso } });
    adminUser.lastLogin = nowIso;

    // 6. Generate Admin JWT Token
    const token = signToken({
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role || 'admin',
      isAdmin: true
    }, 14 * 24 * 60 * 60); // 14 days expiry

    res.json({
      success: true,
      message: 'Admin authorization successful!',
      user: sanitizeUser(adminUser),
      token
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: err.message || 'Server error during admin authentication' });
  }
}

/**
 * Get Current Admin Profile
 * GET /api/admin/me
 */
export async function getAdminMe(req, res) {
  try {
    const adminId = req.admin?.id;
    let user = null;

    if (adminId) {
      user = await User.findOne({ id: adminId });
    }
    if (!user) {
      user = req.admin;
    }

    res.json({
      success: true,
      admin: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Create New Administrator / Moderator
 * POST /api/admin/create
 */
export async function createAdmin(req, res) {
  try {
    const { username, email, password, name, role = 'admin' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanUsername = String(username).trim();

    // Check duplicate
    const found = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    if (found) {
      return res.status(409).json({ error: 'An account with this email or username already exists.' });
    }

    const adminId = 'usr-admin-' + Date.now().toString(36);
    const hashedPassword = hashPassword(password);
    const newAdmin = {
      id: adminId,
      username: cleanUsername,
      name: name ? String(name).trim() : cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      provider: 'email',
      role: (role === 'moderator') ? 'moderator' : 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    await User.create(newAdmin);

    res.status(201).json({
      success: true,
      message: `Admin account "${cleanUsername}" created successfully!`,
      user: sanitizeUser(newAdmin)
    });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: err.message || 'Server error creating admin' });
  }
}

/**
 * Admin Logout
 * POST /api/admin/logout
 */
export async function logoutAdmin(req, res) {
  try {
    res.json({ success: true, message: 'Admin logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
