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
        io.to(roomCode).emit('game:ended', { winnerId: newState.winner });
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
    });
  });
}
