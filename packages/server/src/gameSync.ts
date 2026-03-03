import type { Server, Socket } from 'socket.io';
import type { MoveOption } from '@ludi/shared';
import { gameReducer } from '@ludi/shared';
import { getRoom } from './roomManager.js';

/** Check that it's this socket's turn */
function isPlayersTurn(socketId: string, room: ReturnType<typeof getRoom>): boolean {
  if (!room?.gameState) return false;
  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
  if (!currentPlayer) return false;
  const entry = room.players.get(currentPlayer.id);
  return entry?.socketId === socketId;
}

// Track server-side turn timers per room
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTurnTimer(roomCode: string) {
  const existing = turnTimers.get(roomCode);
  if (existing) {
    clearTimeout(existing);
    turnTimers.delete(roomCode);
  }
}

export function startTurnTimer(io: Server, roomCode: string) {
  clearTurnTimer(roomCode);
  const room = getRoom(roomCode);
  if (!room?.gameState || room.gameState.winner) return;

  const timerSeconds = room.gameState.config.turnTimer;
  if (!timerSeconds) return;

  const elapsed = Date.now() - room.gameState.turnStartedAt;
  const remaining = timerSeconds * 1000 - elapsed;
  if (remaining <= 0) return;

  const timer = setTimeout(() => {
    turnTimers.delete(roomCode);
    const currentRoom = getRoom(roomCode);
    if (!currentRoom?.gameState || currentRoom.gameState.winner) return;

    const newState = gameReducer(currentRoom.gameState, { type: 'PASS_TURN' });
    currentRoom.gameState = newState;
    io.to(roomCode).emit('game:state_update', newState);

    // Restart timer for next turn
    startTurnTimer(io, roomCode);
  }, remaining + 500); // small buffer to let client-side timer fire first

  turnTimers.set(roomCode, timer);
}

export function setupGameSync(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('game:roll_dice', ({ roomCode }: { roomCode: string }) => {
      if (typeof roomCode !== 'string') return;
      const room = getRoom(roomCode);
      if (!room || !room.gameState) return;
      if (!isPlayersTurn(socket.id, room)) return;

      const newState = gameReducer(room.gameState, { type: 'ROLL_DICE' });
      room.gameState = newState;

      io.to(roomCode).emit('game:state_update', newState);
      io.to(roomCode).emit('game:dice_rolled', {
        values: newState.diceValues,
        playerId: newState.players[newState.currentPlayerIndex]?.id,
      });
      startTurnTimer(io, roomCode);
    });

    socket.on('game:select_move', ({ roomCode, moveOption }: { roomCode: string; moveOption: MoveOption }) => {
      if (typeof roomCode !== 'string' || !moveOption) return;
      const room = getRoom(roomCode);
      if (!room || !room.gameState) return;
      if (!isPlayersTurn(socket.id, room)) return;

      const newState = gameReducer(room.gameState, { type: 'SELECT_MOVE', moveOption });
      room.gameState = newState;

      io.to(roomCode).emit('game:state_update', newState);
      io.to(roomCode).emit('game:piece_moved', { moves: moveOption.moves });

      if (newState.winner) {
        clearTurnTimer(roomCode);
        io.to(roomCode).emit('game:ended', { winnerId: newState.winner });
      } else {
        startTurnTimer(io, roomCode);
      }
    });

    socket.on('game:pass_turn', ({ roomCode }: { roomCode: string }) => {
      if (typeof roomCode !== 'string') return;
      const room = getRoom(roomCode);
      if (!room || !room.gameState) return;
      if (!isPlayersTurn(socket.id, room)) return;

      const newState = gameReducer(room.gameState, { type: 'PASS_TURN' });
      room.gameState = newState;

      io.to(roomCode).emit('game:state_update', newState);
      startTurnTimer(io, roomCode);
    });
  });
}
