import type { Server, Socket } from 'socket.io';
import { getRoom, getAllRooms } from './roomManager.js';

const disconnectTimers = new Map<string, NodeJS.Timeout>();
const RECONNECT_GRACE = 2 * 60 * 1000; // 2 minutes

export function setupReconnection(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('player:reconnect', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
      const room = getRoom(roomCode);
      if (!room) {
        socket.emit('reconnect:failed', { reason: 'Room not found' });
        return;
      }

      const playerEntry = room.players.get(playerId);
      if (!playerEntry) {
        socket.emit('reconnect:failed', { reason: 'Player not in room' });
        return;
      }

      // Cancel disconnect timer
      const timerKey = `${roomCode}-${playerId}`;
      const timer = disconnectTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(timerKey);
      }

      // Update socket ID and connection status
      playerEntry.socketId = socket.id;
      playerEntry.player.isConnected = true;

      socket.join(roomCode);
      socket.emit('reconnect:success', {
        roomCode,
        gameState: room.gameState,
        players: Array.from(room.players.values()).map(e => e.player),
        status: room.status,
        hostId: room.hostId,
      });
      io.to(roomCode).emit('player:reconnected', { playerId });
    });

    socket.on('disconnect', () => {
      // Find rooms this socket is in
      for (const [code, room] of getAllRooms()) {
        for (const [playerId, entry] of room.players) {
          if (entry.socketId === socket.id) {
            entry.player.isConnected = false;
            io.to(code).emit('player:disconnected', { playerId });

            // Start grace period timer
            const timerKey = `${code}-${playerId}`;
            const timer = setTimeout(() => {
              // AI takes over after grace period
              io.to(code).emit('player:ai_takeover', { playerId });
              disconnectTimers.delete(timerKey);
            }, RECONNECT_GRACE);

            disconnectTimers.set(timerKey, timer);
          }
        }
      }
    });
  });
}
