import type { GameConfig, GameState, Player } from '@ludi/shared';
import { createGameState, createPlayers } from '@ludi/shared';

export interface Room {
  code: string;
  hostId: string;
  config: GameConfig;
  players: Map<string, { socketId: string; player: Player }>;
  spectators: Map<string, { socketId: string; name: string }>;
  gameState: GameState | null;
  createdAt: number;
  status: 'waiting' | 'playing' | 'finished';
}

const rooms = new Map<string, Room>();

const ROOM_TTL = 2 * 60 * 60 * 1000; // 2 hours

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(hostId: string, socketId: string, config: GameConfig, playerName: string): Room {
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const room: Room = {
    code,
    hostId,
    config,
    players: new Map(),
    spectators: new Map(),
    gameState: null,
    createdAt: Date.now(),
    status: 'waiting',
  };

  room.players.set(hostId, {
    socketId,
    player: {
      id: hostId,
      name: playerName,
      colors: [],
      isAI: false,
      isConnected: true,
    },
  });

  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, playerId: string, socketId: string, playerName: string): Room | null {
  const room = rooms.get(code);
  if (!room || room.status !== 'waiting') return null;
  if (room.players.size >= room.config.playerCount) return null;

  room.players.set(playerId, {
    socketId,
    player: {
      id: playerId,
      name: playerName,
      colors: [],
      isAI: false,
      isConnected: true,
    },
  });

  return room;
}

export function getRoom(code: string): Room | null {
  return rooms.get(code) || null;
}

export function startGame(code: string): GameState | null {
  const room = rooms.get(code);
  if (!room || room.status !== 'waiting') return null;
  if (room.players.size < room.config.playerCount) return null;

  const players = createPlayers(room.config);
  const entries = Array.from(room.players.values());

  for (let i = 0; i < players.length; i++) {
    if (entries[i]) {
      players[i].id = entries[i].player.id;
      players[i].name = entries[i].player.name;
    }
  }

  room.gameState = createGameState(room.config, players);
  room.status = 'playing';
  return room.gameState;
}

export function rematchGame(code: string): GameState | null {
  const room = rooms.get(code);
  if (!room || !room.gameState) return null;

  // Reset game state with same config and players
  const players = room.gameState.players.map(p => ({ ...p }));
  room.gameState = createGameState(room.config, players);
  room.status = 'playing';
  return room.gameState;
}

export function removeRoom(code: string): void {
  rooms.delete(code);
}

// Cleanup expired rooms
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL) {
      rooms.delete(code);
    }
  }
}, 60000);

export function getAllRooms(): IterableIterator<[string, Room]> {
  return rooms.entries();
}

export function listOpenRooms(): { code: string; playerCount: number; maxPlayers: number; config: GameConfig }[] {
  const result: { code: string; playerCount: number; maxPlayers: number; config: GameConfig }[] = [];
  for (const [code, room] of rooms) {
    if (room.status === 'waiting') {
      result.push({
        code,
        playerCount: room.players.size,
        maxPlayers: room.config.playerCount,
        config: room.config,
      });
    }
  }
  return result;
}

export function addSpectator(code: string, spectatorId: string, socketId: string, name: string): Room | null {
  const room = rooms.get(code);
  if (!room || room.status !== 'playing') return null;
  room.spectators.set(spectatorId, { socketId, name });
  return room;
}

export function removeSpectator(code: string, spectatorId: string): void {
  const room = rooms.get(code);
  if (room) {
    room.spectators.delete(spectatorId);
  }
}

export function removeSpectatorBySocket(socketId: string): void {
  for (const [, room] of rooms) {
    for (const [specId, spec] of room.spectators) {
      if (spec.socketId === socketId) {
        room.spectators.delete(specId);
      }
    }
  }
}

export function listActiveGames(): { code: string; players: { name: string; colors: string[] }[]; turnCount: number; spectatorCount: number }[] {
  const result: { code: string; players: { name: string; colors: string[] }[]; turnCount: number; spectatorCount: number }[] = [];
  for (const [code, room] of rooms) {
    if (room.status === 'playing' && room.gameState) {
      result.push({
        code,
        players: room.gameState.players.map(p => ({ name: p.name, colors: p.colors })),
        turnCount: room.gameState.turnCount,
        spectatorCount: room.spectators.size,
      });
    }
  }
  return result;
}
