import type { Server, Socket } from 'socket.io';
import { getRoom } from './roomManager.js';

const MAX_MESSAGE_LENGTH = 200;
const RATE_LIMIT_MS = 500;
const lastMessageTime = new Map<string, number>();

export function setupChatHandler(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('chat:message', ({ roomCode, playerId, playerName, text, isPreset }: {
      roomCode: string;
      playerId: string;
      playerName: string;
      text: string;
      isPreset: boolean;
    }) => {
      // Validate room exists
      if (typeof roomCode !== 'string') return;
      const room = getRoom(roomCode);
      if (!room) return;

      // Rate limit per socket
      const now = Date.now();
      const last = lastMessageTime.get(socket.id) || 0;
      if (now - last < RATE_LIMIT_MS) return;
      lastMessageTime.set(socket.id, now);

      // Validate and sanitize message
      if (typeof text !== 'string' || !text.trim()) return;
      const cleanText = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      const cleanName = typeof playerName === 'string'
        ? playerName.trim().slice(0, 20) || 'Player'
        : 'Player';

      const message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        playerId: typeof playerId === 'string' ? playerId : socket.id,
        playerName: cleanName,
        text: cleanText,
        timestamp: Date.now(),
        isPreset: !!isPreset,
      };

      io.to(roomCode).emit('chat:message', message);
    });

    socket.on('disconnect', () => {
      lastMessageTime.delete(socket.id);
    });
  });
}
