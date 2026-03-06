import { randomUUID } from 'crypto';
import { getDb } from './database.js';
import type { GameHistoryEntry } from '@ludi/shared';

export interface GameResultInput {
  userId: string;
  opponentName: string;
  opponentUserId?: string;
  result: 'win' | 'loss';
  turns: number;
  captures?: number;
  locksFormed?: number;
  gameMode?: string;
  playerCount?: number;
}

export function recordGameResult(input: GameResultInput): string {
  const db = getDb();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO game_results (id, user_id, opponent_name, opponent_user_id, result, turns, captures, locks_formed, game_mode, player_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.userId,
    input.opponentName,
    input.opponentUserId || null,
    input.result,
    input.turns,
    input.captures || 0,
    input.locksFormed || 0,
    input.gameMode || 'online',
    input.playerCount || 2,
    Date.now(),
  );

  return id;
}

export function getUserStats(userId: string): {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalCaptures: number;
  totalLocksFormed: number;
  eloRating: number;
} {
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as games_played,
      SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
      SUM(captures) as total_captures,
      SUM(locks_formed) as total_locks_formed
    FROM game_results
    WHERE user_id = ?
  `).get(userId) as any;

  const user = db.prepare('SELECT elo_rating FROM users WHERE id = ?').get(userId) as any;

  return {
    gamesPlayed: stats?.games_played || 0,
    wins: stats?.wins || 0,
    losses: stats?.losses || 0,
    totalCaptures: stats?.total_captures || 0,
    totalLocksFormed: stats?.total_locks_formed || 0,
    eloRating: user?.elo_rating || 1200,
  };
}

export function getRecentGames(userId: string, limit = 20): GameHistoryEntry[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT opponent_name, result, turns, captures, created_at
    FROM game_results
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit) as any[];

  return rows.map(row => ({
    date: new Date(row.created_at).toLocaleDateString(),
    opponent: row.opponent_name,
    result: row.result,
    turns: row.turns,
    captures: row.captures,
  }));
}

export function recordImportedGame(userId: string, game: {
  opponent: string;
  result: 'win' | 'loss';
  turns: number;
  date?: string;
}): void {
  const db = getDb();
  const id = randomUUID();
  const createdAt = game.date ? new Date(game.date).getTime() : Date.now();

  db.prepare(`
    INSERT INTO game_results (id, user_id, opponent_name, result, turns, captures, locks_formed, game_mode, player_count, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, 'local', 2, ?)
  `).run(id, userId, game.opponent, game.result, game.turns, createdAt);
}
