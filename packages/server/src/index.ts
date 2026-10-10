import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import app from './app.js';
import { createRoom, joinRoom, startGame, listOpenRooms, getRoom, rematchGame, addSpectator, removeSpectatorBySocket, listActiveGames } from './roomManager.js';
import { setupGameSync, startTurnTimer } from './gameSync.js';
import { setupChatHandler } from './chatHandler.js';
import { setupReconnection } from './reconnection.js';
import { getDb } from './db/index.js';
import { verifyToken } from './auth.js';
import { getFriendIds } from './db/friendRepository.js';
import { findById } from './db/userRepository.js';

const PORT = process.env.PORT || 4301;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize database
getDb();
console.log('Database initialized');

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN.split(','),
    methods: ['GET', 'POST'],
  },
});

/** Sanitize player name: trim, cap length, strip control chars */
function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return 'Player';
  const clean = name.trim().replace(/[\x00-\x1f]/g, '').slice(0, 20);
  return clean || 'Player';
}

/** Validate room code format (6 alphanumeric chars) */
function isValidRoomCode(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
}

/** Find the playerId associated with a socket in a room */
function getPlayerIdBySocket(room: ReturnType<typeof getRoom>, socketId: string): string | null {
  if (!room) return null;
  for (const [playerId, entry] of room.players) {
    if (entry.socketId === socketId) return playerId;
  }
  return null;
}

/** Direct lookup: find socketId for a given playerId in a room */
function getSocketIdByPlayerId(room: ReturnType<typeof getRoom>, playerId: string): string | null {
  if (!room) return null;
  const entry = room.players.get(playerId);
  return entry?.socketId ?? null;
}

// Socket.io auth middleware — extract userId from JWT if present
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token && typeof token === 'string') {
    const payload = verifyToken(token);
    if (payload) {
      (socket.data as any).userId = payload.userId;
      (socket.data as any).username = payload.username;
    }
  }
  // Always allow connection (guests play without auth)
  next();
});

/** Track logged-in userId → Set of active socketIds */
const onlineUsers = new Map<string, Set<string>>();

function addOnlineSocket(userId: string, socketId: string): boolean {
  let sockets = onlineUsers.get(userId);
  if (!sockets) {
    sockets = new Set();
    onlineUsers.set(userId, sockets);
  }
  const isFirst = sockets.size === 0;
  sockets.add(socketId);
  return isFirst;
}

function removeOnlineSocket(userId: string, socketId: string): boolean {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }
  return false;
}

function getOnlineSocketIds(userId: string): string[] {
  return Array.from(onlineUsers.get(userId) ?? []);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Register user as online and notify their friends (only on first socket)
  const connectedUserId: string | undefined = (socket.data as any).userId;
  if (connectedUserId) {
    const isFirst = addOnlineSocket(connectedUserId, socket.id);
    if (isFirst) {
      const user = findById(connectedUserId);
      if (user) {
        for (const friendId of getFriendIds(connectedUserId)) {
          for (const friendSocketId of getOnlineSocketIds(friendId)) {
            io.to(friendSocketId).emit('friend:online', { userId: connectedUserId, displayName: user.displayName });
          }
        }
      }
    }
  }

  socket.on('room:create', ({ config, playerName }, callback) => {
    if (typeof callback !== 'function') return;
    const name = sanitizeName(playerName);
    const playerId = randomUUID();
    const room = createRoom(playerId, socket.id, config, name);
    socket.join(room.code);
    callback({
      roomCode: room.code,
      playerId,
      players: Array.from(room.players.values()).map(e => e.player),
    });
  });

  socket.on('room:join', ({ roomCode, playerName }, callback) => {
    if (typeof callback !== 'function') return;
    if (!isValidRoomCode(roomCode)) {
      callback({ error: 'Invalid room code' });
      return;
    }
    const name = sanitizeName(playerName);
    const playerId = randomUUID();
    const existing = getRoom(roomCode);
    if (!existing) {
      callback({ error: 'Room not found' });
      return;
    }
    if (existing.status !== 'waiting') {
      callback({ error: 'Game already in progress' });
      return;
    }
    if (existing.players.size >= existing.config.playerCount) {
      callback({ error: 'Room is full' });
      return;
    }
    const room = joinRoom(roomCode, playerId, socket.id, name);
    if (!room) {
      callback({ error: 'Could not join room' });
      return;
    }
    socket.join(roomCode);
    const playersList = Array.from(room.players.values()).map(e => e.player);
    io.to(roomCode).emit('room:player_joined', {
      playerId,
      playerName: name,
      playerCount: room.players.size,
      players: playersList,
    });
    callback({ roomCode, playerId, players: playersList });
  });

  socket.on('room:start', ({ roomCode }, callback?) => {
    if (!isValidRoomCode(roomCode)) return;
    const room = getRoom(roomCode);
    if (!room) {
      if (typeof callback === 'function') callback({ error: 'Not authorized' });
      return;
    }
    const socketPlayerId = getPlayerIdBySocket(room, socket.id);
    if (socketPlayerId !== room.hostId) {
      if (typeof callback === 'function') callback({ error: 'Not authorized' });
      return;
    }
    const gameState = startGame(roomCode);
    if (gameState) {
      io.to(roomCode).emit('game:started', gameState);
      startTurnTimer(io, roomCode);
      if (typeof callback === 'function') callback({ success: true });
    } else {
      if (typeof callback === 'function') callback({ error: 'Cannot start game' });
    }
  });

  socket.on('game:rematch', ({ roomCode }: { roomCode: string }, callback?) => {
    if (!isValidRoomCode(roomCode)) return;
    const room = getRoom(roomCode);
    if (!room) return;

    // Verify sender is in the room
    const socketPlayerId = getPlayerIdBySocket(room, socket.id);
    if (!socketPlayerId) return;

    const gameState = rematchGame(roomCode);
    if (gameState) {
      io.to(roomCode).emit('game:started', gameState);
      startTurnTimer(io, roomCode);
      if (typeof callback === 'function') callback({ success: true });
    } else {
      if (typeof callback === 'function') callback({ error: 'Cannot rematch' });
    }
  });

  socket.on('room:list', (callback) => {
    if (typeof callback === 'function') callback(listOpenRooms());
  });

  socket.on('room:list_active', (callback) => {
    if (typeof callback === 'function') callback(listActiveGames());
  });

  socket.on('room:spectate', ({ roomCode, spectatorName }, callback) => {
    if (typeof callback !== 'function') return;
    if (!isValidRoomCode(roomCode)) {
      callback({ error: 'Invalid room code' });
      return;
    }
    const name = sanitizeName(spectatorName);
    const spectatorId = randomUUID();
    const room = addSpectator(roomCode, spectatorId, socket.id, name);
    if (!room) {
      callback({ error: 'Game not found or not in progress' });
      return;
    }
    socket.join(roomCode);
    callback({
      gameState: room.gameState,
      players: Array.from(room.players.values()).map(e => e.player),
    });
    io.to(roomCode).emit('room:spectator_update', {
      spectatorCount: room.spectators.size,
    });
  });

  // --- Voice signaling relay (WebRTC) ---
  // Sender identity is always derived from the socket (not the payload) for security.

  socket.on('voice:join', ({ roomCode }: { roomCode: string }) => {
    if (!isValidRoomCode(roomCode)) return;
    const room = getRoom(roomCode);
    if (!room) return;
    const senderId = getPlayerIdBySocket(room, socket.id);
    if (!senderId) return;
    socket.to(roomCode).emit('voice:peer_joined', { playerId: senderId });
  });

  socket.on('voice:offer', ({ roomCode, targetPlayerId, sdp }: {
    roomCode: string;
    targetPlayerId: string;
    sdp: unknown;
  }) => {
    if (!isValidRoomCode(roomCode)) return;
    const room = getRoom(roomCode);
    if (!room) return;
    const senderId = getPlayerIdBySocket(room, socket.id);
    if (!senderId) return;
    const targetSocketId = getSocketIdByPlayerId(room, targetPlayerId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit('voice:offer', { fromPlayerId: senderId, sdp });
  });

  socket.on('voice:answer', ({ roomCode, targetPlayerId, sdp }: {
    roomCode: string;
    targetPlayerId: string;
    sdp: unknown;
  }) => {
    if (!isValidRoomCode(roomCode)) return;
    const room = getRoom(roomCode);
    if (!room) return;
    const senderId = getPlayerIdBySocket(room, socket.id);
    if (!senderId) return;
    const targetSocketId = getSocketIdByPlayerId(room, targetPlayerId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit('voice:answer', { fromPlayerId: senderId, sdp });
  });

  socket.on('voice:ice_candidate', ({ roomCode, targetPlayerId, candidate }: {
    roomCode: string;
    targetPlayerId: string;
    candidate: unknown;
  }) => {
    if (!isValidRoomCode(roomCode)) return;
    const room = getRoom(roomCode);
    if (!room) return;
    const senderId = getPlayerIdBySocket(room, socket.id);
    if (!senderId) return;
    const targetSocketId = getSocketIdByPlayerId(room, targetPlayerId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit('voice:ice_candidate', { fromPlayerId: senderId, candidate });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    removeSpectatorBySocket(socket.id);

    // Unregister this socket; notify friends only when the last socket goes away
    if (connectedUserId) {
      const isLast = removeOnlineSocket(connectedUserId, socket.id);
      if (isLast) {
        for (const friendId of getFriendIds(connectedUserId)) {
          for (const friendSocketId of getOnlineSocketIds(friendId)) {
            io.to(friendSocketId).emit('friend:offline', { userId: connectedUserId });
          }
        }
      }
    }
  });
});

// Setup game handlers
setupGameSync(io);
setupChatHandler(io);
setupReconnection(io);

httpServer.listen(PORT, () => {
  console.log(`Ludi server running on port ${PORT}`);
});
