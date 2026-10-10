import { randomUUID } from 'crypto';
import { getDb } from './database.js';
import type { AuthUser } from '@ludi/shared';

export interface FriendEntry {
  userId: string;
  displayName: string;
  eloRating: number;
}

export interface FriendRequest {
  id: string;
  requesterUserId: string;
  recipientUserId: string;
  requesterDisplayName: string;
  recipientDisplayName: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  createdAt: number;
  respondedAt: number | null;
}

function mapRequestRow(row: any): FriendRequest {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id,
    recipientUserId: row.recipient_user_id,
    requesterDisplayName: row.requester_display_name,
    recipientDisplayName: row.recipient_display_name,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? null,
  };
}

// ─── Friendship (accepted) ────────────────────────────────

export function areFriends(userId: string, otherUserId: string): boolean {
  const db = getDb();
  const row = db.prepare(
    'SELECT 1 FROM friends WHERE user_id = ? AND friend_user_id = ?'
  ).get(userId, otherUserId);
  return row !== undefined;
}

/** Get all accepted friends of a user */
export function getFriends(userId: string): FriendEntry[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT u.id, u.display_name, u.elo_rating
    FROM friends f
    JOIN users u ON f.friend_user_id = u.id
    WHERE f.user_id = ?
    ORDER BY u.display_name ASC
  `).all(userId) as any[];
  return rows.map(row => ({
    userId: row.id,
    displayName: row.display_name,
    eloRating: row.elo_rating,
  }));
}

/** Get IDs of all accepted friends (for server-side presence lookup) */
export function getFriendIds(userId: string): string[] {
  const db = getDb();
  return (db.prepare('SELECT friend_user_id FROM friends WHERE user_id = ?').all(userId) as any[])
    .map(row => row.friend_user_id);
}

/** Remove mutual friendship */
export function removeFriend(userId: string, friendUserId: string): void {
  const db = getDb();
  db.prepare(
    'DELETE FROM friends WHERE (user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)'
  ).run(userId, friendUserId, friendUserId, userId);
}

// ─── Friend requests ──────────────────────────────────────

export function getPendingRequestBetween(
  userA: string,
  userB: string
): FriendRequest | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT fr.*,
           ru.display_name AS requester_display_name,
           rc.display_name AS recipient_display_name
    FROM friend_requests fr
    JOIN users ru ON fr.requester_user_id = ru.id
    JOIN users rc ON fr.recipient_user_id = rc.id
    WHERE fr.status = 'pending'
      AND ((fr.requester_user_id = ? AND fr.recipient_user_id = ?)
        OR (fr.requester_user_id = ? AND fr.recipient_user_id = ?))
  `).get(userA, userB, userB, userA) as any;
  return row ? mapRequestRow(row) : null;
}

export function createFriendRequest(
  requesterUserId: string,
  recipientUserId: string
): FriendRequest {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    'INSERT INTO friend_requests (id, requester_user_id, recipient_user_id, status, created_at) VALUES (?, ?, ?, \'pending\', ?)'
  ).run(id, requesterUserId, recipientUserId, now);
  return getPendingRequestBetween(requesterUserId, recipientUserId)!;
}

export function acceptFriendRequest(requestId: string): FriendRequest | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM friend_requests WHERE id = ? AND status = \'pending\'').get(requestId) as any;
  if (!row) return null;

  const now = Date.now();
  db.transaction(() => {
    db.prepare('UPDATE friend_requests SET status = \'accepted\', responded_at = ? WHERE id = ?').run(now, requestId);
    db.prepare('INSERT OR IGNORE INTO friends (id, user_id, friend_user_id, created_at) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), row.requester_user_id, row.recipient_user_id, now);
    db.prepare('INSERT OR IGNORE INTO friends (id, user_id, friend_user_id, created_at) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), row.recipient_user_id, row.requester_user_id, now);
  })();

  const updated = db.prepare(`
    SELECT fr.*,
           ru.display_name AS requester_display_name,
           rc.display_name AS recipient_display_name
    FROM friend_requests fr
    JOIN users ru ON fr.requester_user_id = ru.id
    JOIN users rc ON fr.recipient_user_id = rc.id
    WHERE fr.id = ?
  `).get(requestId) as any;
  return updated ? mapRequestRow(updated) : null;
}

export function rejectFriendRequest(requestId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    'UPDATE friend_requests SET status = \'rejected\', responded_at = ? WHERE id = ? AND status = \'pending\''
  ).run(Date.now(), requestId);
  return result.changes > 0;
}

export function cancelFriendRequest(requestId: string, requesterId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    'UPDATE friend_requests SET status = \'canceled\', responded_at = ? WHERE id = ? AND requester_user_id = ? AND status = \'pending\''
  ).run(Date.now(), requestId, requesterId);
  return result.changes > 0;
}

export function getIncomingFriendRequests(userId: string): FriendRequest[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT fr.*,
           ru.display_name AS requester_display_name,
           rc.display_name AS recipient_display_name
    FROM friend_requests fr
    JOIN users ru ON fr.requester_user_id = ru.id
    JOIN users rc ON fr.recipient_user_id = rc.id
    WHERE fr.recipient_user_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `).all(userId) as any[];
  return rows.map(mapRequestRow);
}

export function getOutgoingFriendRequests(userId: string): FriendRequest[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT fr.*,
           ru.display_name AS requester_display_name,
           rc.display_name AS recipient_display_name
    FROM friend_requests fr
    JOIN users ru ON fr.requester_user_id = ru.id
    JOIN users rc ON fr.recipient_user_id = rc.id
    WHERE fr.requester_user_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `).all(userId) as any[];
  return rows.map(mapRequestRow);
}

// ─── User lookup ──────────────────────────────────────────

/** Find a registered user by their exact display name */
export function findUserByDisplayName(displayName: string): AuthUser | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT id, username, display_name, elo_rating, email FROM users WHERE display_name = ?'
  ).get(displayName) as any;
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    eloRating: row.elo_rating,
    email: row.email || undefined,
  };
}
