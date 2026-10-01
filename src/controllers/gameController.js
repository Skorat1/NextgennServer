import { isMySQLConnected } from '../config/db.js';
import { Game } from '../models/Game.js';
import { Category } from '../models/Category.js';
import { sanitizeGameUrl } from '../utils/sanitize.js';
import { detectGameMetadata } from '../services/scraperService.js';

const DEFAULT_CATEGORY_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e', '#6366f1'
];

/**
 * Automatically creates and broadcasts a new category if it does not yet exist
 */
export async function autoEnsureCategoryExists(rawCategory, customName = '') {
  if (!rawCategory || typeof rawCategory !== 'string') return null;
  const trimmed = rawCategory.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return null;

  const catId = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!catId) return null;

  try {
    let existing = await Category.findOne({ id: catId });
    if (!existing) {
      existing = await Category.findOne({ name: trimmed });
    }

    if (existing) {
      return existing;
    }

    const formattedName = customName && customName.trim()
      ? customName.trim()
      : trimmed
          .split(/[-_\s]+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

    const randomColor = DEFAULT_CATEGORY_COLORS[Math.floor(Math.random() * DEFAULT_CATEGORY_COLORS.length)];

    const newCategory = {
      id: catId,
      name: formattedName,
      icon: catId,
      image: '',
      color: randomColor,
      count: 1
    };

    const created = await Category.create(newCategory);
    return created || newCategory;
  } catch (err) {
    console.warn('Could not auto-create category:', err.message);
    return null;
  }
}

let cachedGamesList = null;
let cachedGamesTime = 0;
const CACHE_TTL_MS = 6000; // 6 seconds in-memory cache

export function invalidateGamesCache() {
  cachedGamesList = null;
  cachedGamesTime = 0;
}

// Get all games (Supports filters: category, featured, search, limit)
export async function getGames(req, res) {
  const { category, featured, search, limit, status } = req.query;
  const isDefaultQuery = !category && !featured && !search && !limit && !status;

  // Serve instant in-memory cache for main catalog requests
  if (isDefaultQuery && cachedGamesList && (Date.now() - cachedGamesTime < CACHE_TTL_MS)) {
    res.setHeader('Cache-Control', 'public, max-age=3, stale-while-revalidate=10');
    return res.json(cachedGamesList);
  }

  res.setHeader('Cache-Control', 'public, max-age=3, stale-while-revalidate=10');

  try {
    const gamesList = await Game.find({ category, featured, search, limit, status });
    const result = gamesList || [];
    if (isDefaultQuery) {
      cachedGamesList = result;
      cachedGamesTime = Date.now();
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get single game by ID
export async function getGameById(req, res) {
  try {
    const rawId = req.params.id;
    const game = await Game.findOne({ id: rawId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create new game
export async function createGame(req, res) {
  try {
    const gameData = { ...req.body };
    if (gameData.gameUrl) {
      gameData.gameUrl = sanitizeGameUrl(gameData.gameUrl);
    }
    if (!gameData.id) {
      gameData.id = (gameData.title || 'game')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-4);
    } else {
      gameData.id = String(gameData.id)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Auto-create category in Categories table if it does not exist
    if (gameData.category) {
      const ensured = await autoEnsureCategoryExists(gameData.category, req.body.categoryName);
      if (ensured && ensured.id) {
        gameData.category = ensured.id;
      }
    }

    gameData.plays = typeof gameData.plays === 'number' ? gameData.plays : 0;
    gameData.likes = typeof gameData.likes === 'number' ? gameData.likes : 0;
    gameData.dislikes = typeof gameData.dislikes === 'number' ? gameData.dislikes : 0;

    const totalVotes = gameData.likes + gameData.dislikes;
    gameData.rating = totalVotes > 0 ? Number(((gameData.likes / totalVotes) * 5).toFixed(1)) : 5.0;
    if (!gameData.createdAt) gameData.createdAt = new Date().toISOString().split('T')[0];
    if (!Array.isArray(gameData.tags)) {
      gameData.tags = gameData.tags ? String(gameData.tags).split(',').map(t => t.trim()).filter(Boolean) : [];
    }

    const created = await Game.create(gameData);
    invalidateGamesCache();
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}


// Update game
export async function updateGame(req, res) {
  try {
    const rawId = req.params.id;
    const bodyData = { ...req.body };
    if (bodyData.gameUrl) {
      bodyData.gameUrl = sanitizeGameUrl(bodyData.gameUrl);
    }

    if (bodyData.category) {
      const ensured = await autoEnsureCategoryExists(bodyData.category, req.body.categoryName);
      if (ensured && ensured.id) {
        bodyData.category = ensured.id;
      }
    }

    const existing = await Game.findOne({ id: rawId });
    const prevLikes = existing?.likes || 0;
    const prevDislikes = existing?.dislikes || 0;
    const likes = typeof bodyData.likes === 'number' ? bodyData.likes : prevLikes;
    const dislikes = typeof bodyData.dislikes === 'number' ? bodyData.dislikes : prevDislikes;
    const total = likes + dislikes;
    const rating = total > 0 ? Number(((likes / total) * 5).toFixed(1)) : (existing?.rating || 4.8);

    const updatePayload = {
      ...bodyData,
      likes,
      dislikes,
      rating
    };

    const updated = await Game.findOneAndUpdate(
      { id: rawId },
      { $set: updatePayload },
      { new: true, upsert: true }
    );

    invalidateGamesCache();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Delete single game
export async function deleteGame(req, res) {
  try {
    const rawId = String(req.params.id || '');
    if (!rawId) {
      return res.status(400).json({ error: 'Game ID required' });
    }

    await Game.deleteMany({ id: rawId });
    invalidateGamesCache();
    res.json({ success: true, message: 'Game deleted successfully', id: rawId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete all games
export async function deleteAllGames(req, res) {
  try {
    await Game.deleteMany({});
    invalidateGamesCache();
    res.json({ success: true, message: 'All games deleted from database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Toggle Featured
export async function toggleFeatured(req, res) {
  try {
    const rawId = req.params.id;
    const existing = await Game.findOne({ id: rawId });
    if (!existing) return res.status(404).json({ error: 'Game not found' });

    const nextFeatured = !existing.featured;
    const updated = await Game.findOneAndUpdate(
      { id: rawId },
      { $set: { featured: nextFeatured } },
      { new: true }
    );

    invalidateGamesCache();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Increment play count
export async function recordPlay(req, res) {
  try {
    const rawId = req.params.id;
    const updated = await Game.findOneAndUpdate(
      { id: rawId },
      { $inc: { plays: 1 } },
      { new: true }
    );

    res.json({ success: true, id: rawId, plays: updated?.plays || 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cast live game vote (like / dislike)
export async function voteGame(req, res) {
  try {
    const { vote, previousVote } = req.body || {};
    const gameId = req.params.id;
    const game = await Game.findOne({ id: gameId });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    let likes = typeof game.likes === 'number' ? game.likes : 0;
    let dislikes = typeof game.dislikes === 'number' ? game.dislikes : 0;

    // Undo previous vote if any
    if (previousVote === 'like') {
      likes = Math.max(0, likes - 1);
    } else if (previousVote === 'dislike') {
      dislikes = Math.max(0, dislikes - 1);
    }

    // Apply new vote
    if (vote === 'like') {
      likes += 1;
    } else if (vote === 'dislike') {
      dislikes += 1;
    }

    const totalVotes = likes + dislikes;
    const rating = totalVotes > 0 ? Number(((likes / totalVotes) * 5).toFixed(1)) : 4.8;

    const updatedGame = await Game.findOneAndUpdate(
      { id: gameId },
      { $set: { likes, dislikes, rating } },
      { new: true }
    );

    res.json({
      success: true,
      game: updatedGame,
      id: updatedGame?.id || gameId,
      likes,
      dislikes,
      rating,
      vote
    });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Auto-detect metadata endpoint
export async function detectMetadata(req, res) {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const detected = await detectGameMetadata(url);
    return res.json({
      success: Boolean(detected.thumbnail || detected.title),
      data: detected
    });
  } catch (error) {
    console.error('Error detecting metadata:', error);
    res.status(500).json({ error: 'Failed to detect game metadata', details: error.message });
  }
}

// Set all games to draft status
export async function draftAllGames(req, res) {
  try {
    const result = await Game.setAllDraft();
    invalidateGamesCache();
    res.json({
      success: true,
      message: 'All games set to draft status',
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error('Error setting all games to draft:', err);
    res.status(500).json({ error: err.message });
  }
}

// Set all games to active status (Publish All)
export async function activateAllGames(req, res) {
  try {
    const result = await Game.setAllActive();
    invalidateGamesCache();
    res.json({
      success: true,
      message: 'All games set to active status',
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error('Error setting all games to active:', err);
    res.status(500).json({ error: err.message });
  }
}

// Helper: Calculate suggested tile size (Automatic Masonry Gallery)
function calculateSuggestedTileSize(w, h) {
  // In the automatic Masonry Gallery concept, all games default to 'auto'
  // so the masonry gallery automatically formats card dimensions without manual configuration.
  return 'auto';
}

// Helper: Map GameMonetize category to NextGenn category
function mapCategory(rawCat) {
  if (!rawCat) return 'arcade';
  const c = String(rawCat).toLowerCase().trim();
  const map = {
    'hypercasual': 'arcade',
    'racing': 'action',
    'puzzle': 'puzzle',
    'adventure': 'action',
    'shooting': 'action',
    'cooking': 'arcade',
    'girls': 'arcade',
    'soccer': 'sports',
    'arcade': 'arcade',
    'clicker': 'arcade',
    'action': 'action',
    'sports': 'sports',
    'classic': 'classic',
    'cyber': 'cyber',
    'cards': 'puzzle',
    'board': 'puzzle'
  };
  return map[c] || c || 'arcade';
}

// Fetch GameMonetize Feed
export async function fetchGameMonetizeFeed(req, res) {
  try {
    const feedUrl = req.body?.feedUrl || req.query?.feedUrl || 'https://gamemonetize.com/feed.php?format=0&num=50&page=9';
    
    // Fetch feed server-side
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NextGenn/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`GameMonetize returned status ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();
    if (!Array.isArray(rawData)) {
      throw new Error('GameMonetize response is not a valid JSON array');
    }

    // Get all existing game IDs & URLs from database to check for duplicates
    const existingGames = await Game.find({ status: 'all' });
    const existingIds = new Set(existingGames.map(g => String(g.id || g._id || '')));
    const existingUrls = new Set(existingGames.map(g => (g.gameUrl || '').trim().toLowerCase()));

    const parsedGames = rawData.map(item => {
      const gmId = String(item.id || '');
      const assignedId = `gm-${gmId}`;
      const cleanUrl = sanitizeGameUrl(item.url || '');
      const width = Number(item.width) || 800;
      const height = Number(item.height) || 600;
      const suggestedTileSize = calculateSuggestedTileSize(width, height);
      const mappedCat = mapCategory(item.category);
      const alreadyExists = existingIds.has(assignedId) || existingUrls.has(cleanUrl.toLowerCase());

      return {
        id: assignedId,
        gmId,
        title: item.title || 'Untitled Game',
        description: item.description || '',
        instructions: item.instructions || '',
        gameUrl: cleanUrl,
        thumbnail: item.thumb || '',
        banner: item.thumb || '',
        category: mappedCat,
        originalCategory: item.category || 'Arcade',
        tags: typeof item.tags === 'string'
          ? item.tags.split(',').map(t => t.trim()).filter(Boolean)
          : (Array.isArray(item.tags) ? item.tags : []),
        width,
        height,
        suggestedTileSize,
        tileSize: suggestedTileSize,
        alreadyExists,
        status: 'active'
      };
    });

    res.json({
      success: true,
      feedUrl,
      count: parsedGames.length,
      alreadyImportedCount: parsedGames.filter(g => g.alreadyExists).length,
      games: parsedGames
    });
  } catch (err) {
    console.error('Error fetching GameMonetize feed:', err);
    res.status(500).json({ error: err.message });
  }
}

// Bulk Import GameMonetize Games into Catalog
export async function importGameMonetizeGames(req, res) {
  try {
    const { games: incomingGames, status = 'active' } = req.body;
    if (!Array.isArray(incomingGames) || incomingGames.length === 0) {
      return res.status(400).json({ error: 'No games provided for import' });
    }

    const imported = [];

    for (const item of incomingGames) {
      const gmId = String(item.gmId || item.id || '').replace(/^gm-/, '');
      const gameId = `gm-${gmId}`;

      const gamePayload = {
        id: gameId,
        title: item.title || 'Untitled Game',
        category: item.category || mapCategory(item.originalCategory) || 'arcade',
        description: item.description || '',
        instructions: item.instructions || '',
        thumbnail: item.thumbnail || item.thumb || '',
        banner: item.banner || item.thumbnail || item.thumb || '',
        previewVideo: item.previewVideo || '',
        gameUrl: sanitizeGameUrl(item.gameUrl || item.url || ''),
        tags: Array.isArray(item.tags)
          ? item.tags
          : (typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        rating: 4.8,
        likes: 0,
        dislikes: 0,
        plays: 0,
        featured: Boolean(item.featured),
        tileSize: (item.tileSize && item.tileSize !== '3x2' && item.tileSize !== '4x2' && item.tileSize !== '2x3' && item.tileSize !== '1x2') ? item.tileSize : 'auto',
        status: status || item.status || 'active',
        width: Number(item.width) || 800,
        height: Number(item.height) || 600,
        createdAt: new Date().toISOString().split('T')[0]
      };

      if (gamePayload.category) {
        const ensured = await autoEnsureCategoryExists(gamePayload.category);
        if (ensured && ensured.id) {
          gamePayload.category = ensured.id;
        }
      }

      const saved = await Game.create(gamePayload);
      imported.push(saved);
    }

    invalidateGamesCache();

    res.json({
      success: true,
      message: `Successfully imported ${imported.length} games into catalog`,
      count: imported.length,
      games: imported
    });
  } catch (err) {
    console.error('Error importing GameMonetize games:', err);
    res.status(500).json({ error: err.message });
  }
}

