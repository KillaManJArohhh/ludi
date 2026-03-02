import type { GameState, MoveOption, AIDifficulty, Move, Color } from './types.js';
import { getPiecesByColor, distanceToHomeEntry, getTeamColors, getPiecesAtCircuit } from './utils.js';
import { START_POSITIONS, CIRCUIT_LENGTH, HOME_STRETCH_LENGTH } from './constants.js';

/** Minimum circular distance between two circuit positions */
function circuitDist(a: number, b: number): number {
  const d = ((b - a) % CIRCUIT_LENGTH + CIRCUIT_LENGTH) % CIRCUIT_LENGTH;
  return Math.min(d, CIRCUIT_LENGTH - d);
}

/** Select a move option for AI player */
export function selectAIMove(
  state: GameState,
  difficulty: AIDifficulty
): MoveOption | null {
  const options = state.moveOptions;
  if (options.length === 0) return null;

  switch (difficulty) {
    case 'easy':
      return selectEasyMove(options);
    case 'medium':
      return selectMediumMove(state, options);
    case 'hard':
      return selectHardMove(state, options);
    default:
      return selectEasyMove(options);
  }
}

/** Easy AI: random legal move */
function selectEasyMove(options: MoveOption[]): MoveOption {
  return options[Math.floor(Math.random() * options.length)];
}

/** Medium AI: weighted heuristic scoring */
function selectMediumMove(state: GameState, options: MoveOption[]): MoveOption {
  let bestScore = -Infinity;
  let bestOption = options[0];

  for (const option of options) {
    const score = scoreMoveOption(state, option);
    if (score > bestScore) {
      bestScore = score;
      bestOption = option;
    }
  }

  return bestOption;
}

/** Hard AI: medium + threat analysis + advanced strategy */
function selectHardMove(state: GameState, options: MoveOption[]): MoveOption {
  let bestScore = -Infinity;
  let bestOption = options[0];
  const teamColors = getTeamColors(state, state.currentPlayerIndex);

  for (const option of options) {
    let score = scoreMoveOption(state, option);

    for (const move of option.moves) {
      if (move.to.circuitPos !== null) {
        // Threat analysis: penalize exposed positions
        const exposure = calculateExposure(state, move.to.circuitPos, teamColors);
        score -= exposure * 15;

        // Reduce exposure penalty if forming a lock (locks are safe)
        const friendlyAtDest = getPiecesAtCircuit(state, move.to.circuitPos)
          .filter(p => teamColors.includes(p.color) && p.id !== move.pieceId);
        const otherMovesToSamePos = option.moves.filter(
          m => m.pieceId !== move.pieceId && m.to.circuitPos === move.to.circuitPos
        );
        if (friendlyAtDest.length >= 1 || otherMovesToSamePos.length >= 1) {
          score += exposure * 12; // Lock negates most exposure risk
        }
      }
    }

    // Endgame prioritization: prefer pieces closer to home
    for (const move of option.moves) {
      const piece = state.pieces[move.pieceId];
      if (piece.homePos !== null || move.to.homePos !== null) {
        score += 30;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestOption = option;
    }
  }

  return bestOption;
}

/** Score a move option based on heuristics */
function scoreMoveOption(state: GameState, option: MoveOption): number {
  let score = 0;
  const teamColors = getTeamColors(state, state.currentPlayerIndex);

  for (const move of option.moves) {
    // Capture bonus
    if (move.isCapture) score += 50;

    // Exit base bonus
    if (move.isExit) score += 30;

    // Reaching home bonus
    if (move.to.state === 'home') score += 60;

    // Entering home stretch bonus
    if (move.to.homePos !== null && state.pieces[move.pieceId].homePos === null) {
      score += 40;
    }

    // Progress on home stretch
    if (move.to.homePos !== null) {
      score += move.to.homePos * 8;
    }

    if (move.to.circuitPos !== null) {
      // ── Formation: reward keeping pieces close together ──
      const friendlyActive = teamColors
        .flatMap(c => getPiecesByColor(state, c))
        .filter(p => p.state === 'active' && p.circuitPos !== null && p.id !== move.pieceId);

      // Count how many other moves in this option go to the same square (forming lock this turn)
      const lockingWithMove = option.moves.filter(
        m => m.pieceId !== move.pieceId && m.to.circuitPos === move.to.circuitPos
      ).length;

      // Already-present friendlies at destination
      const friendlyAtDest = getPiecesAtCircuit(state, move.to.circuitPos)
        .filter(p => teamColors.includes(p.color) && p.id !== move.pieceId);

      if (friendlyAtDest.length === 1 || lockingWithMove >= 1) {
        // Would form a lock — high priority
        score += 35;
      }

      // Proximity to other friendly pieces (encourages formation)
      for (const friendly of friendlyActive) {
        if (friendly.circuitPos === null) continue;
        const dist = circuitDist(move.to.circuitPos, friendly.circuitPos);
        if (dist <= 3) score += 10;
        else if (dist <= 6) score += 5;
      }

      // Penalty for isolation (no friendly within 6 squares)
      const hasNearby = friendlyActive.some(
        p => p.circuitPos !== null && circuitDist(move.to.circuitPos!, p.circuitPos) <= 6
      ) || lockingWithMove >= 1 || friendlyAtDest.length >= 1;
      if (!hasNearby && friendlyActive.length > 0) {
        score -= 10;
      }

      // ── Block opponent start squares ──
      for (const [color, startPos] of Object.entries(START_POSITIONS)) {
        if (teamColors.includes(color as Color)) continue;
        if (move.to.circuitPos !== startPos) continue;

        // Only valuable if opponent still has pieces in base
        const opponentBasePieces = getPiecesByColor(state, color as Color)
          .filter(p => p.state === 'base').length;
        if (opponentBasePieces > 0) {
          score += 35;
          // Extra bonus if forming a lock on their start
          if (friendlyAtDest.length >= 1 || lockingWithMove >= 1) {
            score += 25;
          }
        }
      }

      // Bonus for moving toward an opponent start that has pieces in base
      // (strategic positioning within 1-3 squares of opponent start)
      for (const [color, startPos] of Object.entries(START_POSITIONS)) {
        if (teamColors.includes(color as Color)) continue;
        const opponentBasePieces = getPiecesByColor(state, color as Color)
          .filter(p => p.state === 'base').length;
        if (opponentBasePieces > 0) {
          const distToStart = circuitDist(move.to.circuitPos, startPos);
          if (distToStart > 0 && distToStart <= 3) {
            score += 8;
          }
        }
      }
    }
  }

  // Prefer using both dice
  if (option.moves.length >= 2) score += 10;

  return score;
}

/** Calculate exposure risk at a position (how many opponents can reach it) */
function calculateExposure(state: GameState, pos: number, teamColors: Color[]): number {
  let threats = 0;

  for (const piece of Object.values(state.pieces)) {
    if (teamColors.includes(piece.color)) continue;
    if (piece.state !== 'active' || piece.circuitPos === null) continue;

    // Check if opponent can reach this position with any die roll (1-6)
    for (let d = 1; d <= 6; d++) {
      if ((piece.circuitPos + d) % CIRCUIT_LENGTH === pos) {
        threats++;
        break;
      }
    }
  }

  return threats;
}

/** Get thinking delay for AI difficulty */
export function getAIDelay(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case 'easy': return 2600 + Math.random() * 400;
    case 'medium': return 3000 + Math.random() * 500;
    case 'hard': return 3500 + Math.random() * 1000;
  }
}
