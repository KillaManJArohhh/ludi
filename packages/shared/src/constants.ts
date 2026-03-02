import type { Color, GridPos } from './types.js';

export const GRID_SIZE = 13;
export const CELL_SIZE = 40;
export const BOARD_SIZE = GRID_SIZE * CELL_SIZE; // 520
export const CIRCUIT_LENGTH = 48;
export const HOME_STRETCH_LENGTH = 5;
export const PIECES_PER_COLOR = 4;

export const PLAYER_COLORS: Color[] = ['red', 'green', 'yellow', 'blue'];

// Color hex values
export const COLOR_HEX: Record<Color, string> = {
  red: '#DC2626',
  green: '#16A34A',
  yellow: '#EAB308',
  blue: '#2563EB',
};

export const COLOR_LIGHT: Record<Color, string> = {
  red: '#FCA5A5',
  green: '#86EFAC',
  yellow: '#FDE68A',
  blue: '#93C5FD',
};

export const COLOR_DARK: Record<Color, string> = {
  red: '#991B1B',
  green: '#166534',
  yellow: '#A16207',
  blue: '#1E40AF',
};

// ─── 13×13 Board Layout ────────────────────────────────────────────
//
// The cross shape: top arm (cols 5-7, rows 0-4), middle band (rows 5-7, cols 0-12),
// bottom arm (cols 5-7, rows 8-12).
//
// Each arm has 3 columns/rows:
//   - Outer two carry the circuit path (one direction each)
//   - Center column/row is a player's home stretch
//
// Top arm:  col 5 = circuit UP, col 6 = Yellow home stretch, col 7 = circuit DOWN
// Right arm: row 5 = circuit RIGHT, row 6 = Blue home stretch, row 7 = circuit LEFT
// Bottom arm: col 7 = circuit DOWN, col 6 = Red home stretch, col 5 = circuit UP
// Left arm: row 7 = circuit LEFT, row 6 = Green home stretch, row 5 = circuit RIGHT
//
// Bases: Green=top-left, Yellow=top-right, Blue=bottom-right, Red=bottom-left

// ─── 48-Square Circuit ─────────────────────────────────────────────
// Clockwise path. 12 squares between each player's start.
export const CIRCUIT_POSITIONS: GridPos[] = [
  // — Green start, down the right column of top arm —
  { row: 0, col: 7 },  // 0: GREEN START
  { row: 1, col: 7 },  // 1
  { row: 2, col: 7 },  // 2
  { row: 3, col: 7 },  // 3
  { row: 4, col: 7 },  // 4
  // — Corner: top arm → right arm —
  { row: 5, col: 7 },  // 5  (center-area corner)
  // — Right along top row of right arm —
  { row: 5, col: 8 },  // 6
  { row: 5, col: 9 },  // 7
  { row: 5, col: 10 }, // 8
  { row: 5, col: 11 }, // 9
  { row: 5, col: 12 }, // 10
  // — Down the right edge (Blue home entry) —
  { row: 6, col: 12 }, // 11: BLUE HOME ENTRY
  // — Left along bottom row of right arm —
  { row: 7, col: 12 }, // 12: YELLOW START
  { row: 7, col: 11 }, // 13
  { row: 7, col: 10 }, // 14
  { row: 7, col: 9 },  // 15
  { row: 7, col: 8 },  // 16
  // — Corner: right arm → bottom arm —
  { row: 7, col: 7 },  // 17 (center-area corner)
  // — Down the right column of bottom arm —
  { row: 8, col: 7 },  // 18
  { row: 9, col: 7 },  // 19
  { row: 10, col: 7 }, // 20
  { row: 11, col: 7 }, // 21
  { row: 12, col: 7 }, // 22
  // — Across the bottom edge (Red home entry) —
  { row: 12, col: 6 }, // 23: RED HOME ENTRY
  // — Up the left column of bottom arm —
  { row: 12, col: 5 }, // 24: BLUE START
  { row: 11, col: 5 }, // 25
  { row: 10, col: 5 }, // 26
  { row: 9, col: 5 },  // 27
  { row: 8, col: 5 },  // 28
  // — Corner: bottom arm → left arm —
  { row: 7, col: 5 },  // 29 (center-area corner)
  // — Left along bottom row of left arm —
  { row: 7, col: 4 },  // 30
  { row: 7, col: 3 },  // 31
  { row: 7, col: 2 },  // 32
  { row: 7, col: 1 },  // 33
  { row: 7, col: 0 },  // 34
  // — Up the left edge (Green home entry) —
  { row: 6, col: 0 },  // 35: GREEN HOME ENTRY
  // — Right along top row of left arm —
  { row: 5, col: 0 },  // 36: RED START
  { row: 5, col: 1 },  // 37
  { row: 5, col: 2 },  // 38
  { row: 5, col: 3 },  // 39
  { row: 5, col: 4 },  // 40
  // — Corner: left arm → top arm —
  { row: 5, col: 5 },  // 41 (center-area corner)
  // — Up the left column of top arm —
  { row: 4, col: 5 },  // 42
  { row: 3, col: 5 },  // 43
  { row: 2, col: 5 },  // 44
  { row: 1, col: 5 },  // 45
  { row: 0, col: 5 },  // 46
  // — Across top edge (Yellow home entry) —
  { row: 0, col: 6 },  // 47: YELLOW HOME ENTRY
];

// Start squares: where pieces enter the circuit from base
// Positioned 11 squares back from the original starts, closer to each team's home base corner
export const START_POSITIONS: Record<Color, number> = {
  green: 37,  // (5, 1) — left arm, near green's top-left base
  yellow: 1,  // (1, 7) — top arm, near yellow's top-right base
  blue: 13,   // (7, 11) — right arm, near blue's bottom-right base
  red: 25,    // (11, 5) — bottom arm, near red's bottom-left base
};

// Home entry: the last circuit position before entering home stretch.
// After completing a full lap, the piece enters home stretch from here.
// Rotated 90° anti-clockwise from base positions.
export const HOME_ENTRY_POSITIONS: Record<Color, number> = {
  yellow: 47, // (0, 6) → enters col 6 going down (top arm)
  blue: 11,   // (6, 12) → enters row 6 going left (right arm)
  red: 23,    // (12, 6) → enters col 6 going up (bottom arm)
  green: 35,  // (6, 0) → enters row 6 going right (left arm)
};

// Home stretch: 5 colored squares leading toward the center.
// No overlaps with circuit positions (uses center column/row of each arm).
// Rotated 90° anti-clockwise from base positions.
export const HOME_STRETCH_POSITIONS: Record<Color, GridPos[]> = {
  yellow: [
    { row: 1, col: 6 }, // HS 0 (top arm, going down)
    { row: 2, col: 6 }, // HS 1
    { row: 3, col: 6 }, // HS 2
    { row: 4, col: 6 }, // HS 3
    { row: 5, col: 6 }, // HS 4 (at center edge)
  ],
  blue: [
    { row: 6, col: 11 }, // HS 0 (right arm, going left)
    { row: 6, col: 10 }, // HS 1
    { row: 6, col: 9 },  // HS 2
    { row: 6, col: 8 },  // HS 3
    { row: 6, col: 7 },  // HS 4 (at center edge)
  ],
  red: [
    { row: 11, col: 6 }, // HS 0 (bottom arm, going up)
    { row: 10, col: 6 }, // HS 1
    { row: 9, col: 6 },  // HS 2
    { row: 8, col: 6 },  // HS 3
    { row: 7, col: 6 },  // HS 4 (at center edge)
  ],
  green: [
    { row: 6, col: 1 },  // HS 0 (left arm, going right)
    { row: 6, col: 2 },  // HS 1
    { row: 6, col: 3 },  // HS 2
    { row: 6, col: 4 },  // HS 3
    { row: 6, col: 5 },  // HS 4 (at center edge)
  ],
};

// Base positions: where pieces sit before entering the game.
// 4 pieces per color in their corner quadrant.
export const BASE_POSITIONS: Record<Color, GridPos[]> = {
  green: [
    { row: 1, col: 1 },
    { row: 1, col: 3 },
    { row: 3, col: 1 },
    { row: 3, col: 3 },
  ],
  yellow: [
    { row: 1, col: 9 },
    { row: 1, col: 11 },
    { row: 3, col: 9 },
    { row: 3, col: 11 },
  ],
  blue: [
    { row: 9, col: 9 },
    { row: 9, col: 11 },
    { row: 11, col: 9 },
    { row: 11, col: 11 },
  ],
  red: [
    { row: 9, col: 1 },
    { row: 9, col: 3 },
    { row: 11, col: 1 },
    { row: 11, col: 3 },
  ],
};

// Teams for 2-player mode (diagonal partners)
export const TEAMS: [Color, Color][] = [
  ['red', 'yellow'],   // Team 1
  ['green', 'blue'],   // Team 2
];

// All squares that make up the cross/path shape on the board (for rendering background)
export const CROSS_SQUARES: GridPos[] = [];

// Top arm: cols 5-7, rows 0-4
for (let row = 0; row <= 4; row++) {
  for (let col = 5; col <= 7; col++) {
    CROSS_SQUARES.push({ row, col });
  }
}
// Middle band: cols 0-12, rows 5-7
for (let row = 5; row <= 7; row++) {
  for (let col = 0; col <= 12; col++) {
    CROSS_SQUARES.push({ row, col });
  }
}
// Bottom arm: cols 5-7, rows 8-12
for (let row = 8; row <= 12; row++) {
  for (let col = 5; col <= 7; col++) {
    CROSS_SQUARES.push({ row, col });
  }
}

// Board square colors for the circuit
export function getSquareColor(circuitIndex: number): string {
  // Start squares are the player's color
  for (const [color, pos] of Object.entries(START_POSITIONS)) {
    if (circuitIndex === pos) return COLOR_HEX[color as Color];
  }
  // Home entry squares get a subtle tint
  for (const [color, pos] of Object.entries(HOME_ENTRY_POSITIONS)) {
    if (circuitIndex === pos) return COLOR_LIGHT[color as Color];
  }
  // Alternate between warm tones
  return circuitIndex % 2 === 0 ? '#F5E6D0' : '#E8D5B8';
}

// Preset Jamaican chat phrases
export const JAMAICAN_PHRASES = [
  'Wa gwaan!',
  'Likkle more!',
  'Yuh dead now!',
  'Nice one!',
  'Hurry up!',
  'Big up yuhself!',
  'Wah happen!',
  'Mi a come fi yuh!',
];
