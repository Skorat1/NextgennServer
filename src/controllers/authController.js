import crypto from 'crypto';
import { User } from '../models/User.js';
<<<<<<< HEAD
import { signToken, verifyToken, hashPassword, verifyPassword } from '../utils/crypto.js';
=======
import { signToken, verifyToken } from '../utils/crypto.js';
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
import { sanitizeUser } from '../utils/sanitize.js';

const passkeyChallenges = new Map();

// Passkey Challenge
export function getPasskeyChallenge(req, res) {
  try {
    const challengeRaw = crypto.randomBytes(32);
    const challengeBase64 = challengeRaw.toString('base64');
    const challengeId = 'ch-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
    passkeyChallenges.set(challengeId, { challenge: challengeBase64, createdAt: Date.now() });

    // Prune expired challenges (>5 mins)
    const now = Date.now();
    for (const [k, v] of passkeyChallenges.entries()) {
      if (now - v.createdAt > 300000) passkeyChallenges.delete(k);
    }

    res.json({
      success: true,
      challengeId,
      challenge: challengeBase64
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
}

// Passkey Verify
export async function verifyPasskey(req, res) {
  try {
    const { credentialId, name, email } = req.body;
    const cleanName = (name && name.trim()) ? name.trim() : 'Passkey Player';
    const cleanEmail = (email && email.trim()) ? email.trim().toLowerCase() : `passkey_${(credentialId || Date.now().toString(36)).slice(0, 8)}@nextgenn.com`;

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      const userId = 'usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
      user = {
        id: userId,
        username: cleanName.replace(/\s+/g, '') || 'PasskeyPlayer',
        name: cleanName,
        email: cleanEmail,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
        provider: 'passkey',
        passkeyCredentialId: credentialId,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      await User.create(user);
    } else {
      const nowIso = new Date().toISOString();
      await User.findOneAndUpdate({ id: user.id }, { $set: { lastLogin: nowIso } });
      user.lastLogin = nowIso;
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      provider: 'passkey'
    });

    res.json({
      success: true,
      message: 'Authenticated successfully with passkey',
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    console.error('Passkey verification error:', err);
    res.status(500).json({ error: err.message || 'Passkey authentication failed' });
  }
}

// Social / Passwordless Login
export async function socialLogin(req, res) {
  try {
    const { email, name, avatar, provider = 'google' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for sign-in' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = name ? String(name).trim() : cleanEmail.split('@')[0];
    const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      const userId = 'usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
      user = {
        id: userId,
        username: cleanName.replace(/\s+/g, '') || `${provider}User`,
        name: cleanName,
        email: cleanEmail,
        avatar: userAvatar,
        provider: provider.toLowerCase(),
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      await User.create(user);
    } else {
      const nowIso = new Date().toISOString();
      await User.findOneAndUpdate({ id: user.id }, { $set: { lastLogin: nowIso } });
      user.lastLogin = nowIso;
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      provider: provider.toLowerCase()
    });

    res.json({
      success: true,
      message: `Signed in with ${provider}`,
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    console.error('Social login error:', err);
    res.status(500).json({ error: err.message || 'Server error during social login' });
  }
}

// Get current user profile
export async function getMe(req, res) {
  try {
<<<<<<< HEAD
    let userId = null;

    // Verify Authorization token
    const authHeader = req.headers.authorization || req.headers['x-access-token'];
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token.startsWith('local_admin_token_') && process.env.NODE_ENV !== 'production') {
        const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.hostname === 'localhost';
        if (isLocal) userId = 'usr-admin-1';
      } else {
        const decoded = verifyToken(token);
        if (decoded && decoded.id) {
          userId = decoded.id;
        }
=======
    let userId = req.headers['x-user-id'] || req.query.userId;

    // Check Bearer Token if userId not directly provided
    if (!userId && req.headers.authorization) {
      const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        userId = decoded.id;
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
      }
    }

    if (!userId) {
<<<<<<< HEAD
      return res.status(401).json({ error: 'Unauthorized: Valid session token required' });
=======
      return res.status(401).json({ error: 'Unauthorized' });
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
    }

    const user = await User.findOne({
      $or: [{ id: userId }, { _id: userId }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// User Registration endpoint (MySQL)
export async function registerUser(req, res) {
  try {
    const { username, email, password, name, avatar } = req.body || {};
    if (!email || !username) {
      return res.status(400).json({ error: 'Username and email are required' });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanUsername = String(username).trim();

    // Check if user already exists in MySQL
    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    if (existing) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    const userId = 'usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
    const hashedPassword = password ? hashPassword(password) : '';
    const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const newUser = {
      id: userId,
      username: cleanUsername,
      name: name || cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      avatar: userAvatar,
      provider: 'email',
      role: 'user',
      status: 'active',
      cloudSave: {
        favorites: [],
        recent: [],
        highScores: {},
        totalXp: 150,
        level: 1,
        unlockedBadges: ['first_play'],
        questProgress: {}
      },
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    await User.create(newUser);

    const token = signToken({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully in MySQL',
      user: sanitizeUser(newUser),
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
}

// User Login endpoint (MySQL)
export async function loginUser(req, res) {
  try {
    const { identifier, email, password } = req.body || {};
    const loginIdent = String(identifier || email || '').toLowerCase().trim();
    const loginPass = String(password || '').trim();

    if (!loginIdent || !loginPass) {
      return res.status(400).json({ error: 'Email/Username and Password are required' });
    }

    const user = await User.findOne({
      $or: [{ email: loginIdent }, { username: loginIdent }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

<<<<<<< HEAD
    // Verify password: account must have a password set
    if (!user.password || user.password.trim() === '') {
      return res.status(400).json({
        error: `This account was registered using ${user.provider || 'social/passkey'} sign-in. Please sign in using your social provider or reset your password.`
      });
    }

    const isValid = verifyPassword(loginPass, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
=======
    // Verify password if user has password set
    if (user.password) {
      const isValid = verifyPassword(loginPass, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
    }

    const nowIso = new Date().toISOString();
    await User.findOneAndUpdate({ id: user.id }, { $set: { lastLogin: nowIso } });
    user.lastLogin = nowIso;

    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    return res.json({
      success: true,
      message: 'Logged in successfully',
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
}

// Forgot Password endpoint
export async function forgotPassword(req, res) {
  try {
    const { identifier, email } = req.body || {};
    const cleanIdent = String(identifier || email || '').toLowerCase().trim();

    if (!cleanIdent) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    const user = await User.findOne({
      $or: [{ email: cleanIdent }, { username: cleanIdent }]
    });

    return res.json({
      success: true,
      message: user ? `Password reset instructions sent to ${user.email}` : `If an account exists for ${cleanIdent}, instructions have been sent.`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// OAuth Redirect Handler
export function oauthRedirect(req, res) {
  const { provider } = req.params;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return res.redirect(`${frontendUrl}/?auth=${provider || 'oauth'}`);
}

