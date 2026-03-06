import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateToken, verifyToken } from './auth.js';
import { createUser, findByUsername, validatePassword, findById, getLeaderboard } from './db/userRepository.js';
import { getUserStats, getRecentGames, recordImportedGame } from './db/gameResultRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Auth routes ─────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password || !displayName) {
    res.status(400).json({ error: 'Username, password, and display name are required' });
    return;
  }

  if (typeof username !== 'string' || username.length < 3 || username.length > 20) {
    res.status(400).json({ error: 'Username must be 3-20 characters' });
    return;
  }

  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  if (typeof displayName !== 'string' || displayName.length < 1 || displayName.length > 20) {
    res.status(400).json({ error: 'Display name must be 1-20 characters' });
    return;
  }

  const existing = findByUsername(username);
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  try {
    const user = createUser(username, password, displayName);
    const token = generateToken({ userId: user.id, username: user.username });
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = findByUsername(username);
  if (!user || !validatePassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = generateToken({ userId: user.id, username: user.username });
  res.json({
    user: { id: user.id, username: user.username, displayName: user.displayName, eloRating: user.eloRating },
    token,
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const user = findById(payload.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
});

// ─── Stats routes ────────────────────────────────────────

app.get('/api/stats/:userId', (req, res) => {
  const stats = getUserStats(req.params.userId);
  const recentGames = getRecentGames(req.params.userId, 20);
  res.json({ stats, recentGames });
});

app.get('/api/leaderboard', (_req, res) => {
  const leaderboard = getLeaderboard(20);
  res.json({ leaderboard });
});

app.post('/api/stats/import', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const { games } = req.body;
  if (!Array.isArray(games)) {
    res.status(400).json({ error: 'games array required' });
    return;
  }

  let imported = 0;
  for (const game of games) {
    try {
      recordImportedGame(payload.userId, game);
      imported++;
    } catch {
      // Skip invalid entries
    }
  }

  res.json({ imported });
});

// Serve static client files in production
const clientDistPath = process.env.CLIENT_DIST_PATH
  || path.resolve(__dirname, '../../client/dist');

app.use(express.static(clientDistPath));

// SPA fallback — serve index.html for all non-API routes
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

export default app;
