export type Color = 'red' | 'green' | 'yellow' | 'blue';

export type PieceState = 'base' | 'active' | 'home';

export type TurnPhase =
  | 'waiting_for_roll'
  | 'rolling'
  | 'selecting_piece'
  | 'selecting_split'
  | 'animating'
  | 'turn_complete';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface GameConfig {
  playerCount: 2 | 4;
  diceMode: 'single' | 'double';
  lockKillsLock: boolean;
  teamSharing: boolean;
  turnTimer: number; // 0=off, 15/30/60 seconds per turn
}

export interface Piece {
  id: string; // e.g. "red-0"
  color: Color;
  index: number; // 0-3 within color
  state: PieceState;
  circuitPos: number | null; // 0-47 on circuit
  homePos: number | null; // 0-4 on home stretch (4 = home)
}

export interface Player {
  id: string;
  name: string;
  colors: Color[]; // 1 color in 4-player, 2 colors in 2-player
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  isConnected: boolean;
}

export interface DiceResult {
  values: number[];
  isDouble: boolean;
  hasSix: boolean;
}

export interface Move {
  pieceId: string;
  diceValue: number; // which die value is used
  from: { circuitPos: number | null; homePos: number | null; state: PieceState };
  to: { circuitPos: number | null; homePos: number | null; state: PieceState };
  isExit: boolean; // exiting base
  isCapture: boolean;
  capturedPieceId?: string;
  capturedPieceIds?: string[]; // for block-break captures (multiple pieces)
  isBlockMove: boolean; // moving a block as a unit
}

export interface MoveOption {
  moves: Move[]; // 1 move per die used
  diceUsed: number[]; // indices into diceValues
  description: string;
}

export interface GameState {
  config: GameConfig;
  players: Player[];
  pieces: Record<string, Piece>;
  currentPlayerIndex: number;
  currentColorIndex: number;
  turnPhase: TurnPhase;
  diceValues: number[];
  diceRemaining: number[]; // dice values not yet assigned
  selectedMoves: Move[];
  moveOptions: MoveOption[];
  extraRoll: boolean;
  winner: string | null; // player id
  turnCount: number;
  lastAction: string | null;
  gatesOpened: Record<Color, boolean>;
  turnStartedAt: number; // timestamp when current turn started
}

export type GameAction =
  | { type: 'ROLL_DICE'; values?: number[] }
  | { type: 'SELECT_MOVE'; moveOption: MoveOption }
  | { type: 'PASS_TURN' }
  | { type: 'RESET'; config: GameConfig; players: Player[] };

export interface GridPos {
  row: number;
  col: number;
}

export interface SvgPos {
  x: number;
  y: number;
}

// Socket events
export interface RoomConfig {
  roomCode: string;
  hostId: string;
  gameConfig: GameConfig;
  maxPlayers: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
  isPreset: boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalCaptures: number;
  totalLocksFormed: number;
  gameHistory: GameHistoryEntry[];
}

export interface GameHistoryEntry {
  date: string;
  opponent: string;
  result: 'win' | 'loss';
  turns: number;
  captures?: number;
  eloChange?: number;
}

// Auth types
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  eloRating: number;
  email?: string;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  eloRating: number;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}
