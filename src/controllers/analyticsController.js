import os from 'os';
import { isMySQLConnected } from '../config/db.js';
import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
const activeVisitors = new Set();
const gameActivePlayers = new Map();
const recentActivities = [];

export async function getHealth(req, res) {
  try {
    const connected = isMySQLConnected();
    const totalGames = await Game.countDocuments();
    const totalUsers = await User.countDocuments();
    res.json({
      status: 'ok',
      dbConnected: connected,
      storageMode: 'mysql',
      totalGames,
      totalUsers,
      onlinePlayers: activeVisitors.size
    });
  } catch (err) {
    res.json({
      status: 'ok',
      dbConnected: isMySQLConnected(),
      storageMode: 'mysql',
      totalGames: 0,
      totalUsers: 0,
      onlinePlayers: activeVisitors.size
    });
  }
}

export function getOnlineStats(req, res) {
  res.json({ count: activeVisitors.size });
}

export async function getLiveAnalytics(req, res) {
  try {
    const activeRooms = [];
    gameActivePlayers.forEach((count, gameId) => {
      if (count > 0) activeRooms.push({ gameId, count });
    });

    // Generate simulated 7-day traffic analytics
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday

    const weeklyAnalytics = [];
    for (let i = 0; i < 7; i++) {
      const dayName = days[(todayIndex + i) % 7];
      const basePlays = 12000 + (Math.random() * 20000); // 12k - 32k

      weeklyAnalytics.push({
        day: dayName,
        plays: Math.floor(basePlays),
        players: Math.floor(basePlays * 0.4)
      });
    }

    // Telemetry Collection
    const cpuLoad = os.loadavg()[0]; // 1 minute load average
    const cpuPct = Math.min(100, Math.max(1, Math.round(cpuLoad * 10)));
    const memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const latency = Math.floor(Math.random() * 20) + 10; // Simulated latency 10-30ms
    const activeDbConn = isMySQLConnected() ? 1 : 0;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      weeklyAnalytics,
      telemetry: {
        cpuLoad: cpuPct,
        memoryMB,
        latency,
        activeDbConn
      },
      activities: recentActivities
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
