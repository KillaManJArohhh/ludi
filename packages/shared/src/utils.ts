import type { Color, GridPos, SvgPos, Piece, GameState } from './types.js';
import {
  CELL_SIZE,
  CIRCUIT_POSITIONS,
  HOME_STRETCH_POSITIONS,
  BASE_POSITIONS,
  CIRCUIT_LENGTH,
  HOME_STRETCH_LENGTH,
  START_POSITIONS,
  HOME_ENTRY_POSITIONS,
  PLAYER_COLORS,
} from './constants.js';

/** Convert grid position to SVG pixel coordinates (center of cell) */
export function gridToSvg(pos: GridPos): SvgPos {
  return {
    x: pos.col * CELL_SIZE + CELL_SIZE / 2,
    y: pos.row * CELL_SIZE + CELL_SIZE / 2,
  };
}

/** Get the SVG position for a piece based on its current state */
export function getPieceSvgPos(piece: Piece): SvgPos {
  if (piece.state === 'base') {
    const basePos = BASE_POSITIONS[piece.color][piece.index];
    return gridToSvg(basePos);
  }

  if (piece.state === 'home') {
    // Piece has completed the game — show in center area
    // Offset slightly based on piece index
    const homeStretch = HOME_STRETCH_POSITIONS[piece.color];
    const lastPos = homeStretch[homeStretch.length - 1];
    const svg = gridToSvg(lastPos);
    // Offset each piece slightly so they don't stack
    const angle = (piece.index * Math.PI) / 2;
    return {
      x: svg.x + Math.cos(angle) * 8,
      y: svg.y + Math.sin(angle) * 8,
    };
  }

  if (piece.homePos !== null) {
    const homePos = HOME_STRETCH_POSITIONS[piece.color][piece.homePos];
    return gridToSvg(homePos);
  }

  if (piece.circuitPos !== null) {
    const gridPos = CIRCUIT_POSITIONS[piece.circuitPos];
    return gridToSvg(gridPos);
  }

  // Fallback
  return gridToSvg(BASE_POSITIONS[piece.color][piece.index]);
}

/** Advance a circuit position by steps, wrapping around 48 */
export function advanceCircuit(pos: number, steps: number): number {
  return (pos + steps) % CIRCUIT_LENGTH;
}

/** Check if advancing from `from` by `steps` passes or lands on `target` */
export function passesPosition(from: number, steps: number, target: number): boolean {
  for (let i = 1; i <= steps; i++) {
    if ((from + i) % CIRCUIT_LENGTH === target) return true;
  }
  return false;
}

/** Calculate the distance from a circuit position to the home entry */
export function distanceToHomeEntry(circuitPos: number, color: Color): number {
  const homeEntry = HOME_ENTRY_POSITIONS[color];
  if (circuitPos <= homeEntry) {
    return homeEntry - circuitPos;
  }
  return CIRCUIT_LENGTH - circuitPos + homeEntry;
}

/** Check if a piece can enter home stretch from its current circuit position.
 *  Returns homePos 0-4 for home stretch squares, or HOME_STRETCH_LENGTH (5) for reaching HOME. */
export function canEnterHomeStretch(
  circuitPos: number,
  color: Color,
  diceValue: number
): { canEnter: boolean; homePos: number } {
  const dist = distanceToHomeEntry(circuitPos, color);

  if (dist === 0) {
    // At home entry: dice value moves directly into home stretch
    // homePos = diceValue - 1 (roll 1→HS0, roll 2→HS1, ..., roll 5→HS4, roll 6→HOME)
    const hp = diceValue - 1;
    if (hp >= 0 && hp <= HOME_STRETCH_LENGTH) {
      return { canEnter: true, homePos: hp };
    }
    // Overshot (dice > 6 from entry)
    return { canEnter: false, homePos: -1 };
  }

  // Check if move would pass home entry and enter stretch
  if (dist > 0 && dist < diceValue) {
    const remaining = diceValue - dist;
    const hp = remaining - 1;
    if (hp >= 0 && hp <= HOME_STRETCH_LENGTH) {
      return { canEnter: true, homePos: hp };
    }
    // Overshot home
    return { canEnter: false, homePos: -1 };
  }

  return { canEnter: false, homePos: -1 };
}

/** Get all pieces of a given color */
export function getPiecesByColor(state: GameState, color: Color): Piece[] {
  return Object.values(state.pieces).filter(p => p.color === color);
}

/** Get pieces at a circuit position */
export function getPiecesAtCircuit(state: GameState, pos: number): Piece[] {
  return Object.values(state.pieces).filter(
    p => p.state === 'active' && p.circuitPos === pos && p.homePos === null
  );
}

/** Check if there's a block (2+ same-color pieces) at a circuit position */
export function isBlock(state: GameState, pos: number, color: Color): boolean {
  const pieces = getPiecesAtCircuit(state, pos);
  const sameColor = pieces.filter(p => p.color === color);
  return sameColor.length >= 2;
}

/** Check if a position is blocked by an opponent's block */
export function isBlockedByOpponent(
  state: GameState,
  pos: number,
  teamColors: Color[]
): boolean {
  const pieces = getPiecesAtCircuit(state, pos);
  // Group by color
  const colorCounts = new Map<Color, number>();
  for (const p of pieces) {
    colorCounts.set(p.color, (colorCounts.get(p.color) || 0) + 1);
  }
  // Check if any non-team color has a block
  for (const [color, count] of colorCounts) {
    if (count >= 2 && !teamColors.includes(color)) {
      return true;
    }
  }
  return false;
}

/** Get the colors belonging to the current player */
export function getPlayerColors(state: GameState): Color[] {
  return state.players[state.currentPlayerIndex].colors;
}

/** Get team colors (including allied colors in 2-player mode) */
export function getTeamColors(state: GameState, playerIndex: number): Color[] {
  return state.players[playerIndex].colors;
}

/** Create a piece ID */
export function pieceId(color: Color, index: number): string {
  return `${color}-${index}`;
}

/** Check if a color has a block (2+ pieces) at its gate square (HOME_ENTRY_POSITION).
 *  Returns an updated gatesOpened record with any newly opened gates. */
export function checkGatesOpened(state: GameState): Record<Color, boolean> {
  const gatesOpened = { ...state.gatesOpened };
  for (const color of PLAYER_COLORS) {
    if (gatesOpened[color]) continue; // Already open, stays open permanently
    const gatePos = HOME_ENTRY_POSITIONS[color];
    if (isBlock(state, gatePos, color)) {
      gatesOpened[color] = true;
    }
  }
  return gatesOpened;
}

/** Convert piece ID like "red-0" to display name "Red 1" */
export function pieceName(id: string): string {
  const [color, idx] = id.split('-');
  return `${color[0].toUpperCase()}${color.slice(1)} ${parseInt(idx) + 1}`;
}

/** Generate all 16 pieces in base state */
export function createInitialPieces(): Record<string, Piece> {
  const pieces: Record<string, Piece> = {};
  const colors: Color[] = ['red', 'green', 'yellow', 'blue'];
  for (const color of colors) {
    for (let i = 0; i < 4; i++) {
      const id = pieceId(color, i);
      pieces[id] = {
        id,
        color,
        index: i,
        state: 'base',
        circuitPos: null,
        homePos: null,
      };
    }
  }
  return pieces;
}
