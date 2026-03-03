import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import app from './app.js';
import { createRoom, joinRoom, startGame, listOpenRooms, getRoom } from './roomManager.js';
import { setupGameSync } from './gameSync.js';
import { setupChatHandler } from './chatHandler.js';
import { setupReconnection } from './reconnection.js';

const PORT = process.env.PORT || 4301;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

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
    const room = joinRoom(roomCode, playerId, socket.id, name);
    if (!room) {
      callback({ error: 'Room not found or full' });
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
      if (typeof callback === 'function') callback({ success: true });
    } else {
      if (typeof callback === 'function') callback({ error: 'Cannot start game' });
    }
  });

  socket.on('room:list', (callback) => {
    if (typeof callback === 'function') callback(listOpenRooms());
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Setup game handlers
setupGameSync(io);
setupChatHandler(io);
setupReconnection(io);

httpServer.listen(PORT, () => {
  console.log(`Ludi server running on port ${PORT}`);
});
