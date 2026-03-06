import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from './database.js';
import type { AuthUser, LeaderboardEntry } from '@ludi/shared';

const SALT_ROUNDS = 10;

export function createUser(username: string, password: string, displayName: string): AuthUser {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  db.prepare(`
    INSERT INTO users (id, username, password_hash, display_name, elo_rating, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1200, ?, ?)
  `).run(id, username.toLowerCase(), passwordHash, displayName, now, now);

  return { id, username: username.toLowerCase(), displayName, eloRating: 1200 };
}

export function findByUsername(username: string): { id: string; username: string; passwordHash: string; displayName: string; eloRating: number } | null {
  const db = getDb();
  const row = db.prepare('SELECT id, username, password_hash, display_name, elo_rating FROM users WHERE username = ?')
    .get(username.toLowerCase()) as any;
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    eloRating: row.elo_rating,
  };
}

export function validatePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function findById(id: string): AuthUser | null {
  const db = getDb();
  const row = db.prepare('SELECT id, username, display_name, elo_rating FROM users WHERE id = ?')
    .get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    eloRating: row.elo_rating,
  };
}

export function updateElo(userId: string, newRating: number): void {
  const db = getDb();
  db.prepare('UPDATE users SET elo_rating = ?, updated_at = ? WHERE id = ?')
    .run(newRating, Date.now(), userId);
}

export function getLeaderboard(limit = 20): LeaderboardEntry[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT u.id, u.display_name, u.elo_rating,
      (SELECT COUNT(*) FROM game_results WHERE user_id = u.id) as games_played,
      (SELECT COUNT(*) FROM game_results WHERE user_id = u.id AND result = 'win') as wins
    FROM users u
    WHERE (SELECT COUNT(*) FROM game_results WHERE user_id = u.id) > 0
    ORDER BY u.elo_rating DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.id,
    displayName: row.display_name,
    eloRating: row.elo_rating,
    gamesPlayed: row.games_played,
    wins: row.wins,
    winRate: row.games_played > 0 ? Math.round((row.wins / row.games_played) * 100) : 0,
  }));
}
