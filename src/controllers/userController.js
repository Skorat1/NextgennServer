import { User } from '../models/User.js';
import { hashPassword, signToken } from '../utils/crypto.js';
import { sanitizeUser } from '../utils/sanitize.js';

export async function getUsers(req, res) {
  try {
    const users = await User.find();
    return res.json((users || []).map(sanitizeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getUserById(req, res) {
  try {
    const rawId = req.params.id;
    const user = await User.findOne({
      $or: [{ id: rawId }, { _id: rawId }]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createUser(req, res) {
  try {
    const { username, email, password, role, status, name } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanUsername = String(username).trim();

    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        { username: cleanUsername }
      ]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    const userId = 'usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
    const hashedPassword = password ? hashPassword(password) : hashPassword('Default@123');
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const newUser = {
      id: userId,
      username: cleanUsername,
      name: name ? String(name).trim() : cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      avatar,
      provider: 'email',
      role: role || 'user',
      status: status || 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    await User.create(newUser);

    const token = signToken({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      provider: newUser.provider
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: sanitizeUser(newUser),
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const rawId = String(req.params.id || '');
    if (!rawId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    await User.deleteMany({ id: rawId });

    res.json({ success: true, message: 'User deleted successfully', id: rawId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateUser(req, res) {
  try {
    const rawId = req.params.id;
    const updates = { ...req.body };
    if (updates.password && updates.password.trim()) {
      updates.password = hashPassword(updates.password.trim());
    } else {
      delete updates.password;
    }

    const updated = await User.findOneAndUpdate(
      { id: rawId },
      { $set: updates },
      { new: true }
    );

    const sanitized = sanitizeUser(updated);

    res.json({ success: true, user: sanitized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Cloud Game Progress Sync & State Hydration (MySQL-backed)
 */
export async function syncCloudProgress(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required for cloud save' });
    }

    const { favorites, recent, highScores, totalXp, level, unlockedBadges, questProgress } = req.body;
    const progressData = {
      favorites: Array.isArray(favorites) ? favorites : [],
      recent: Array.isArray(recent) ? recent : [],
      highScores: highScores || {},
      totalXp: Number(totalXp) || 0,
      level: Number(level) || 1,
      unlockedBadges: Array.isArray(unlockedBadges) ? unlockedBadges : [],
      questProgress: questProgress || {},
      lastSyncedAt: new Date().toISOString()
    };

    await User.findOneAndUpdate(
      { id: userId },
      { $set: { cloudSave: progressData } }
    );

    return res.json({ success: true, cloudSave: progressData });
  } catch (err) {
    console.error('Cloud sync error:', err);
    return res.status(500).json({ error: 'Failed to sync cloud progress' });
  }
}

export async function getCloudProgress(req, res) {
  try {
    const userId = req.user ? req.user.id : req.params.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findOne({
      $or: [{ id: userId }, { _id: userId }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      cloudSave: user.cloudSave || {
        favorites: [],
        recent: [],
        highScores: {},
        totalXp: 0,
        level: 1,
        unlockedBadges: [],
        questProgress: {}
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get cloud progress' });
  }
}
