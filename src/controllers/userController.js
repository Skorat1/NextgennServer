import { User } from '../models/User.js';
<<<<<<< HEAD
import { hashPassword, signToken, verifyToken } from '../utils/crypto.js';
=======
import { hashPassword, signToken } from '../utils/crypto.js';
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
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
<<<<<<< HEAD

    // Prevent non-admin users from escalating role or status
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'moderator');
    if (!isAdmin) {
      delete updates.role;
      delete updates.status;
    }

=======
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
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
<<<<<<< HEAD
    let authUser = req.user;
    if (!authUser && (req.headers.authorization || req.headers['x-access-token'])) {
      const token = (req.headers.authorization || req.headers['x-access-token']).replace(/^Bearer\s+/i, '').trim();
      authUser = verifyToken(token);
    }

    const requestedUserId = req.body.userId;
    // If authenticated, enforce syncing for their own user id
    let userId = authUser ? authUser.id : (requestedUserId || 'guest_player');

    // If an unauthenticated request attempts to sync progress to an existing registered user account:
    if (!authUser && requestedUserId && !requestedUserId.startsWith('guest')) {
      const existingRegistered = await User.findOne({ $or: [{ id: requestedUserId }, { _id: requestedUserId }] });
      if (existingRegistered && existingRegistered.role !== 'player') {
        return res.status(401).json({ error: 'Authentication required to sync cloud progress for registered accounts.' });
      }
    }

    const { favorites, recent, highScores, totalXp, level, unlockedBadges, questProgress, votes } = req.body;
=======
    const userId = req.user ? req.user.id : (req.body.userId || 'guest_player');
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for cloud save' });
    }

    const { favorites, recent, highScores, totalXp, level, unlockedBadges, questProgress, votes } = req.body;
    const progressData = {
      favorites: Array.isArray(favorites) ? favorites : [],
      recent: Array.isArray(recent) ? recent : [],
      highScores: highScores && typeof highScores === 'object' ? highScores : {},
      totalXp: Number(totalXp) || 0,
      level: Number(level) || 1,
      unlockedBadges: Array.isArray(unlockedBadges) ? unlockedBadges : ['first_play'],
      questProgress: questProgress && typeof questProgress === 'object' ? questProgress : {},
      votes: votes && typeof votes === 'object' ? votes : {},
      lastSyncedAt: new Date().toISOString()
    };
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620

    let user = await User.findOne({
      $or: [{ id: userId }, { _id: userId }]
    });

<<<<<<< HEAD
    const existingSave = (user && user.cloudSave && typeof user.cloudSave === 'object') ? user.cloudSave : {};

    // Carefully merge so partial syncs (e.g. only favorites or only recent) do NOT wipe out other data!
    const progressData = {
      favorites: Array.isArray(favorites) ? favorites : (Array.isArray(existingSave.favorites) ? existingSave.favorites : []),
      recent: Array.isArray(recent) ? recent : (Array.isArray(existingSave.recent) ? existingSave.recent : []),
      highScores: (highScores && typeof highScores === 'object') ? { ...(existingSave.highScores || {}), ...highScores } : (existingSave.highScores || {}),
      totalXp: (typeof totalXp === 'number') ? totalXp : (typeof existingSave.totalXp === 'number' ? existingSave.totalXp : 150),
      level: (typeof level === 'number') ? level : (typeof existingSave.level === 'number' ? existingSave.level : 1),
      unlockedBadges: Array.isArray(unlockedBadges) ? unlockedBadges : (Array.isArray(existingSave.unlockedBadges) ? existingSave.unlockedBadges : ['first_play']),
      questProgress: (questProgress && typeof questProgress === 'object') ? { ...(existingSave.questProgress || {}), ...questProgress } : (existingSave.questProgress || {}),
      votes: (votes && typeof votes === 'object') ? { ...(existingSave.votes || {}), ...votes } : (existingSave.votes || {}),
      lastSyncedAt: new Date().toISOString()
    };

=======
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
    if (!user) {
      await User.create({
        id: userId,
        username: req.body.username || (userId.startsWith('guest') ? 'Player' : userId),
        email: `${userId}@nextgenn.local`,
        role: 'player',
        status: 'active',
        cloudSave: progressData
      });
    } else {
      await User.findOneAndUpdate(
        { id: user.id || userId },
        { $set: { cloudSave: progressData } },
        { upsert: true }
      );
    }

    return res.json({ success: true, cloudSave: progressData });
  } catch (err) {
    console.error('Cloud sync error:', err);
    return res.status(500).json({ error: 'Failed to sync cloud progress to MySQL' });
  }
}

export async function getCloudProgress(req, res) {
  try {
    const userId = req.user ? req.user.id : req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findOne({
      $or: [{ id: userId }, { _id: userId }]
    });

    const defaultSave = {
      favorites: [],
      recent: [],
      highScores: {},
      totalXp: 150,
      level: 1,
      unlockedBadges: ['first_play'],
      questProgress: {},
      votes: {}
    };

    return res.json({
      success: true,
      cloudSave: (user && user.cloudSave) ? { ...defaultSave, ...user.cloudSave } : defaultSave
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get cloud progress from MySQL' });
  }
}
