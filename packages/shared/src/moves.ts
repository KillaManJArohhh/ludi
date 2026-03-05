import type { Color, GameState, Move, MoveOption, Piece } from './types.js';
import {
  CIRCUIT_LENGTH,
  START_POSITIONS,
  HOME_ENTRY_POSITIONS,
  HOME_STRETCH_LENGTH,
} from './constants.js';
import {
  advanceCircuit,
  getPiecesAtCircuit,
  isBlockedByOpponent,
  getTeamColors,
  getActiveColors,
  getPiecesByColor,
  canEnterHomeStretch,
  pieceName,
} from './utils.js';

/** Check if a path from `from` for `steps` is clear of opponent blocks */
function isPathClear(
  state: GameState,
  from: number,
  steps: number,
  teamColors: Color[]
): boolean {
  for (let i = 1; i <= steps; i++) {
    const pos = advanceCircuit(from, i);
    if (isBlockedByOpponent(state, pos, teamColors)) {
      return false;
    }
  }
  return true;
}

/** Get single-piece moves for a given piece and die value.
 *  When movingAsBlock is true, the piece is part of a lock and can capture opponent blocks. */
function getSinglePieceMoves(
  state: GameState,
  piece: Piece,
  diceValue: number,
  teamColors: Color[],
  movingAsBlock = false
): Move | null {
  const startPos = START_POSITIONS[piece.color];
  const homeEntry = HOME_ENTRY_POSITIONS[piece.color];

  // Piece in base: can only exit on a 6
  if (piece.state === 'base') {
    if (diceValue !== 6) return null;

    const piecesAtStart = getPiecesAtCircuit(state, startPos);
    const opponentsAtStart = piecesAtStart.filter(p => !teamColors.includes(p.color));
    const hasOpponentBlock = opponentsAtStart.length >= 2;

    // Check if start square is blocked by opponent
    if (hasOpponentBlock) {
      // Lock Kills Lock rule must be enabled
      if (!state.config.lockKillsLock) return null;

      // Special rule: can break through block with double 6 + at least 2 pieces home
      const isDouble6 = state.diceValues.length === 2 && state.diceValues[0] === 6 && state.diceValues[1] === 6;
      const piecesHome = teamColors.flatMap(c => getPiecesByColor(state, c))
        .filter(p => p.state === 'home').length;

      if (!isDouble6 || piecesHome < 2) {
        return null;
      }

      // Break the block: capture all opponent pieces on start square
      return {
        pieceId: piece.id,
        diceValue: 6,
        from: { circuitPos: null, homePos: null, state: 'base' },
        to: { circuitPos: startPos, homePos: null, state: 'active' },
        isExit: true,
        isCapture: true,
        capturedPieceId: opponentsAtStart[0].id,
        capturedPieceIds: opponentsAtStart.map(p => p.id),
        isBlockMove: false,
      };
    }

    // Check for single capture on start square (block case already handled above)
    const opponentAtStart = opponentsAtStart.length === 1 ? opponentsAtStart[0] : undefined;

    return {
      pieceId: piece.id,
      diceValue: 6,
      from: { circuitPos: null, homePos: null, state: 'base' },
      to: { circuitPos: startPos, homePos: null, state: 'active' },
      isExit: true,
      isCapture: !!opponentAtStart,
      capturedPieceId: opponentAtStart?.id,
      isBlockMove: false,
    };
  }

  // Piece on home stretch
  if (piece.homePos !== null) {
    const newHomePos = piece.homePos + diceValue;
    if (newHomePos === HOME_STRETCH_LENGTH) {
      // Exact count to home!
      return {
        pieceId: piece.id,
        diceValue,
        from: { circuitPos: null, homePos: piece.homePos, state: 'active' },
        to: { circuitPos: null, homePos: null, state: 'home' },
        isExit: false,
        isCapture: false,
        isBlockMove: false,
      };
    }
    if (newHomePos < HOME_STRETCH_LENGTH) {
      return {
        pieceId: piece.id,
        diceValue,
        from: { circuitPos: null, homePos: piece.homePos, state: 'active' },
        to: { circuitPos: null, homePos: newHomePos, state: 'active' },
        isExit: false,
        isCapture: false, // Home stretch is safe
        isBlockMove: false,
      };
    }
    // Overshot — can't move
    return null;
  }

  // Piece on circuit
  if (piece.circuitPos !== null) {
    // Check if this move would enter home stretch
    const homeCheck = canEnterHomeStretch(piece.circuitPos, piece.color, diceValue);
    if (homeCheck.canEnter) {
      // Gate mechanic: if gate is not opened, prevent home stretch entry
      // Piece will be blocked by overshoot check below
      if (!state.gatesOpened[piece.color]) {
        // Fall through — overshoot check will prevent passing home entry
      } else {
        // Gate is open — allow home stretch entry
        // Check path is clear up to home entry
        const distToHome = piece.circuitPos <= homeEntry
          ? homeEntry - piece.circuitPos
          : CIRCUIT_LENGTH - piece.circuitPos + homeEntry;

        if (distToHome > 0 && !isPathClear(state, piece.circuitPos, distToHome, teamColors)) {
          return null;
        }

        if (homeCheck.homePos >= HOME_STRETCH_LENGTH) {
          // This means exact home
          return {
            pieceId: piece.id,
            diceValue,
            from: { circuitPos: piece.circuitPos, homePos: null, state: 'active' },
            to: { circuitPos: null, homePos: null, state: 'home' },
            isExit: false,
            isCapture: false,
            isBlockMove: false,
          };
        }

        return {
          pieceId: piece.id,
          diceValue,
          from: { circuitPos: piece.circuitPos, homePos: null, state: 'active' },
          to: { circuitPos: null, homePos: homeCheck.homePos, state: 'active' },
          isExit: false,
          isCapture: false, // Home stretch is safe
          isBlockMove: false,
        };
      }
    }

    // Pieces can NEVER pass their home entry on the circuit
    const distToEntry = piece.circuitPos <= homeEntry
      ? homeEntry - piece.circuitPos
      : CIRCUIT_LENGTH - piece.circuitPos + homeEntry;

    // Can't move past home entry
    if (distToEntry > 0 && distToEntry < diceValue) {
      return null;
    }

    // At home entry: can only enter home stretch (handled above if possible).
    // If we're still here, the roll doesn't fit — piece must wait.
    if (distToEntry === 0) {
      return null;
    }

    // Normal circuit move
    const newPos = advanceCircuit(piece.circuitPos, diceValue);

    // Check path for blocks
    if (movingAsBlock) {
      // Block: only check intermediate squares, not destination (block can capture at destination)
      for (let i = 1; i < diceValue; i++) {
        const pos = advanceCircuit(piece.circuitPos, i);
        if (isBlockedByOpponent(state, pos, teamColors)) {
          return null;
        }
      }
    } else {
      if (!isPathClear(state, piece.circuitPos, diceValue, teamColors)) {
        return null;
      }
    }

    // Check for capture at destination
    const piecesAtDest = getPiecesAtCircuit(state, newPos);
    const opponentsAtDest = piecesAtDest.filter(p => !teamColors.includes(p.color));

    if (movingAsBlock) {
      const opponentHasBlock = opponentsAtDest.length >= 2;
      // Lock can only capture an opponent lock if lockKillsLock is enabled
      if (opponentHasBlock && !state.config.lockKillsLock) return null;

      return {
        pieceId: piece.id,
        diceValue,
        from: { circuitPos: piece.circuitPos, homePos: null, state: 'active' },
        to: { circuitPos: newPos, homePos: null, state: 'active' },
        isExit: false,
        isCapture: opponentsAtDest.length > 0,
        capturedPieceId: opponentsAtDest[0]?.id,
        capturedPieceIds: opponentsAtDest.length > 0 ? opponentsAtDest.map(p => p.id) : undefined,
        isBlockMove: true,
      };
    }

    // Single piece can't land on opponent block
    if (opponentsAtDest.length >= 2) return null;

    const opponentAtDest = opponentsAtDest.length === 1 ? opponentsAtDest[0] : undefined;

    return {
      pieceId: piece.id,
      diceValue,
      from: { circuitPos: piece.circuitPos, homePos: null, state: 'active' },
      to: { circuitPos: newPos, homePos: null, state: 'active' },
      isExit: false,
      isCapture: !!opponentAtDest,
      capturedPieceId: opponentAtDest?.id,
      isBlockMove: false,
    };
  }

  return null;
}

/** Compute all legal move options for the current player */
export function computeMoveOptions(state: GameState): MoveOption[] {
  const player = state.players[state.currentPlayerIndex];
  const teamColors = getTeamColors(state, state.currentPlayerIndex);
  const activeColors = getActiveColors(state);
  const diceRemaining = state.diceRemaining;

  if (diceRemaining.length === 0) return [];

  const playerPieces = activeColors.flatMap(c => getPiecesByColor(state, c))
    .filter(p => p.state !== 'home');

  if (playerPieces.length === 0) return [];

  const options: MoveOption[] = [];

  // Track pieces that captured earlier this turn (no hit-and-run).
  // Exception: exit-base captures are allowed to continue.
  const capturedPieceIds = new Set(
    state.selectedMoves
      .filter(m => m.isCapture && !m.isExit)
      .map(m => m.pieceId)
  );

  if (diceRemaining.length === 1) {
    // Single die remaining
    const dv = diceRemaining[0];
    for (const piece of playerPieces) {
      // No hit-and-run: skip pieces that already captured this turn
      if (capturedPieceIds.has(piece.id)) continue;
      const move = getSinglePieceMoves(state, piece, dv, teamColors);
      if (move) {
        options.push({
          moves: [move],
          diceUsed: [0],
          description: `Move ${pieceName(piece.id)} by ${dv}`,
        });
      }
    }
  } else if (diceRemaining.length === 2) {
    const [d1, d2] = diceRemaining;
    const isDouble = d1 === d2;

    // Option A: Use d1 on pieceA, d2 on pieceB (or same piece)
    for (const pieceA of playerPieces) {
      const moveA = getSinglePieceMoves(state, pieceA, d1, teamColors);
      if (!moveA) continue;

      // Apply moveA temporarily to check moveB
      const tempState = applyMoveToState(state, moveA);

      const tempPieces = activeColors.flatMap(c => getPiecesByColor(tempState, c))
        .filter(p => p.state !== 'home');

      let foundSecondMove = false;
      for (const pieceB of tempPieces) {
        // No hit-and-run: a piece that captured on the circuit must stop.
        // Exception: a piece born (exiting base) that captures on a start square may continue.
        if (moveA.isCapture && !moveA.isExit && pieceB.id === moveA.pieceId) continue;

        const moveB = getSinglePieceMoves(tempState, pieceB, d2, teamColors);
        if (moveB) {
          foundSecondMove = true;
          const desc = pieceA.id === pieceB.id
            ? `Move ${pieceName(pieceA.id)} by ${d1} then ${d2}`
            : `Move ${pieceName(pieceA.id)} by ${d1}, ${pieceName(pieceB.id)} by ${d2}`;
          options.push({
            moves: [moveA, moveB],
            diceUsed: [0, 1],
            description: desc,
          });
        }
      }

      // If no second move possible, still allow using just d1
      if (!foundSecondMove) {
        options.push({
          moves: [moveA],
          diceUsed: [0],
          description: `Move ${pieceName(pieceA.id)} by ${d1} (${d2} unused)`,
        });
      }
    }

    // Option B: Use d2 on pieceA, d1 on pieceB (skip if doubles)
    if (!isDouble) {
      for (const pieceA of playerPieces) {
        const moveA = getSinglePieceMoves(state, pieceA, d2, teamColors);
        if (!moveA) continue;

        const tempState = applyMoveToState(state, moveA);
        const tempPieces = activeColors.flatMap(c => getPiecesByColor(tempState, c))
          .filter(p => p.state !== 'home');

        let foundSecondMove = false;
        for (const pieceB of tempPieces) {
          // No hit-and-run: a piece that just captured cannot move again
          // Exception: a piece born (exiting base) that captures on start square may continue.
          if (moveA.isCapture && !moveA.isExit && pieceB.id === moveA.pieceId) continue;

          const moveB = getSinglePieceMoves(tempState, pieceB, d1, teamColors);
          if (moveB) {
            foundSecondMove = true;
            const desc = pieceA.id === pieceB.id
              ? `Move ${pieceName(pieceA.id)} by ${d2} then ${d1}`
              : `Move ${pieceName(pieceA.id)} by ${d2}, ${pieceName(pieceB.id)} by ${d1}`;
            options.push({
              moves: [moveA, moveB],
              diceUsed: [1, 0],
              description: desc,
            });
          }
        }

        if (!foundSecondMove) {
          options.push({
            moves: [moveA],
            diceUsed: [1],
            description: `Move ${pieceName(pieceA.id)} by ${d2} (${d1} unused)`,
          });
        }
      }
    }

    // Option C: Use sum on single piece (combined move)
    if (!isDouble) {
      const total = d1 + d2;
      for (const piece of playerPieces) {
        if (piece.state === 'base') continue; // Can't use sum to exit
        const move = getSinglePieceMoves(state, piece, total, teamColors);
        if (move) {
          options.push({
            moves: [{ ...move, diceValue: total }],
            diceUsed: [0, 1],
            description: `Move ${pieceName(piece.id)} by ${total} (${d1}+${d2})`,
          });
        }
      }
    }

    // Block movement on doubles
    if (isDouble) {
      // Find blocks (2+ same-color pieces at same position) — only among active colors
      const blockPositions = findBlocks(state, activeColors);
      for (const { pos, color, pieceIds } of blockPositions) {
        // Move block as a unit (can capture opponent blocks)
        const representative = state.pieces[pieceIds[0]];
        const move = getSinglePieceMoves(state, representative, d1, teamColors, true);
        if (move) {
          // Only first piece triggers capture to avoid double-capturing
          const blockMoves = pieceIds.map((pid, i) => ({
            ...move,
            pieceId: pid,
            isBlockMove: true,
            isCapture: i === 0 ? move.isCapture : false,
            capturedPieceId: i === 0 ? move.capturedPieceId : undefined,
            capturedPieceIds: i === 0 ? move.capturedPieceIds : undefined,
          }));
          options.push({
            moves: blockMoves,
            diceUsed: [0, 1],
            description: `Move ${color[0].toUpperCase()}${color.slice(1)} block by ${d1}`,
          });
        }
      }
    }
  }

  // Deduplicate options
  return deduplicateOptions(options);
}

/** Find all blocks for the given team colors */
function findBlocks(state: GameState, teamColors: Color[]): { pos: number; color: Color; pieceIds: string[] }[] {
  const blocks: { pos: number; color: Color; pieceIds: string[] }[] = [];
  const posMap = new Map<string, string[]>();

  for (const piece of Object.values(state.pieces)) {
    if (piece.state === 'active' && piece.circuitPos !== null && piece.homePos === null) {
      if (teamColors.includes(piece.color)) {
        const key = `${piece.color}-${piece.circuitPos}`;
        if (!posMap.has(key)) posMap.set(key, []);
        posMap.get(key)!.push(piece.id);
      }
    }
  }

  for (const [key, pieceIds] of posMap) {
    if (pieceIds.length >= 2) {
      const [color, pos] = key.split('-') as [Color, string];
      blocks.push({ pos: parseInt(pos), color, pieceIds });
    }
  }

  return blocks;
}

/** Apply a single move to state (for computing subsequent moves) */
export function applyMoveToState(state: GameState, move: Move): GameState {
  const newPieces = { ...state.pieces };

  // Update moved piece
  const piece = { ...newPieces[move.pieceId] };
  piece.state = move.to.state;
  piece.circuitPos = move.to.circuitPos;
  piece.homePos = move.to.homePos;
  newPieces[move.pieceId] = piece;

  // Handle capture (single or multiple for block-break)
  if (move.isCapture) {
    const idsToCapture = move.capturedPieceIds ?? (move.capturedPieceId ? [move.capturedPieceId] : []);
    for (const cid of idsToCapture) {
      const captured = { ...newPieces[cid] };
      captured.state = 'base';
      captured.circuitPos = null;
      captured.homePos = null;
      newPieces[cid] = captured;
    }
  }

  return { ...state, pieces: newPieces };
}

/** Remove duplicate move options */
function deduplicateOptions(options: MoveOption[]): MoveOption[] {
  const seen = new Set<string>();
  return options.filter(opt => {
    const key = opt.moves.map(m => `${m.pieceId}:${m.diceValue}:${m.to.circuitPos}:${m.to.homePos}:${m.to.state}`).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
