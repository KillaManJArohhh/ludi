import type { Server, Socket } from 'socket.io';
import type { MoveOption } from '@ludi/shared';
import { gameReducer, calculateEloChange } from '@ludi/shared';
import { getRoom } from './roomManager.js';
import { recordGameResult } from './db/gameResultRepository.js';
import { findById, updateElo } from './db/userRepository.js';

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

    const gs = currentRoom.gameState;
    let newState;

    if (gs.turnPhase === 'waiting_for_roll') {
      // Auto-roll the dice
      newState = gameReducer(gs, { type: 'ROLL_DICE' });
    } else if (gs.turnPhase === 'selecting_piece' && gs.moveOptions.length > 0) {
      // Auto-select a random move
      const randomMove = gs.moveOptions[Math.floor(Math.random() * gs.moveOptions.length)];
      newState = gameReducer(gs, { type: 'SELECT_MOVE', moveOption: randomMove });
    } else {
      // No moves available — pass
      newState = gameReducer(gs, { type: 'PASS_TURN' });
    }

    currentRoom.gameState = newState;
    io.to(roomCode).emit('game:state_update', newState);

    if (newState.winner) {
      io.to(roomCode).emit('game:ended', { winnerId: newState.winner });
      handleGameEnd(io, roomCode);
    } else {
      // Restart timer for next turn/phase
      startTurnTimer(io, roomCode);
    }
  }, remaining + 500); // small buffer to let client-side timer fire first

  turnTimers.set(roomCode, timer);
}

/** Record game results and update ELO for authenticated players */
function handleGameEnd(io: Server, roomCode: string) {
  const room = getRoom(roomCode);
  if (!room?.gameState?.winner) return;

  const winnerId = room.gameState.winner;
  const turnCount = room.gameState.turnCount;
  const playerCount = room.gameState.config.playerCount;

  // Collect authenticated user IDs from socket data
  const playerUserMap = new Map<string, string>(); // playerId -> userId
  for (const [playerId, entry] of room.players) {
    // Find the socket for this player
    const sockets = io.sockets.sockets;
    for (const [, s] of sockets) {
      if (s.id === entry.socketId && (s.data as any).userId) {
        playerUserMap.set(playerId, (s.data as any).userId);
        break;
      }
    }
  }

  // Record results for each authenticated player
  for (const [playerId, entry] of room.players) {
    const userId = playerUserMap.get(playerId);
    if (!userId) continue;

    const isWinner = playerId === winnerId;
    const winnerEntry = room.players.get(winnerId);
    const opponentName = isWinner
      ? [...room.players.values()].filter(e => e.player.id !== playerId).map(e => e.player.name).join(', ')
      : (winnerEntry?.player.name || 'Unknown');

    // Find opponent user for ELO calculation
    const opponentUserIds = [...playerUserMap.entries()].filter(([pid]) => pid !== playerId);
    const opponentUserId = opponentUserIds.length > 0 ? opponentUserIds[0][1] : undefined;

    recordGameResult({
      userId,
      opponentName,
      opponentUserId,
      result: isWinner ? 'win' : 'loss',
      turns: turnCount,
      gameMode: 'online',
      playerCount,
    });

    // Update ELO
    const userRecord = findById(userId);
    if (userRecord) {
      const opponentRating = opponentUserId
        ? (findById(opponentUserId)?.eloRating || 1200)
        : 1200;
      const eloChange = calculateEloChange(userRecord.eloRating, opponentRating, isWinner);
      const newRating = Math.max(100, userRecord.eloRating + eloChange);
      updateElo(userId, newRating);

      // Notify the player of their stats update
      const socket = [...io.sockets.sockets.values()].find(s => s.id === entry.socketId);
      if (socket) {
        socket.emit('game:stats_updated', {
          eloChange,
          newRating,
          result: isWinner ? 'win' : 'loss',
        });
      }
    }
  }
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
        handleGameEnd(io, roomCode);
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
