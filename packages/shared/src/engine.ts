import type { GameState, GameAction, GameConfig, Player, Color, MoveOption, Move } from './types.js';
import { createInitialPieces, getTeamColors, getPiecesByColor, checkGatesOpened, pieceName } from './utils.js';
import { rollDice, grantsExtraRoll } from './dice.js';
import { computeMoveOptions, applyMoveToState } from './moves.js';
import { PLAYER_COLORS, PIECES_PER_COLOR } from './constants.js';

/** Create initial game state */
export function createGameState(config: GameConfig, players: Player[]): GameState {
  return {
    config,
    players,
    pieces: createInitialPieces(),
    currentPlayerIndex: 0,
    currentColorIndex: 0,
    turnPhase: 'waiting_for_roll',
    diceValues: [],
    diceRemaining: [],
    selectedMoves: [],
    moveOptions: [],
    extraRoll: false,
    winner: null,
    turnCount: 0,
    lastAction: null,
    gatesOpened: { red: false, green: false, yellow: false, blue: false },
    turnStartedAt: Date.now(),
  };
}

/** Create default players for a game */
export function createPlayers(config: GameConfig): Player[] {
  if (config.playerCount === 4) {
    return PLAYER_COLORS.map((color, i) => ({
      id: `player-${i}`,
      name: `Player ${i + 1}`,
      colors: [color],
      isAI: false,
      isConnected: true,
    }));
  }

  // 2-player: diagonal teams
  return [
    {
      id: 'player-0',
      name: 'Player 1',
      colors: ['red', 'yellow'] as Color[],
      isAI: false,
      isConnected: true,
    },
    {
      id: 'player-1',
      name: 'Player 2',
      colors: ['green', 'blue'] as Color[],
      isAI: false,
      isConnected: true,
    },
  ];
}

/** Pure game state reducer */
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.winner) return state; // Game over, no more actions

  switch (action.type) {
    case 'ROLL_DICE':
      return handleRollDice(state, action.values);

    case 'SELECT_MOVE':
      return handleSelectMove(state, action.moveOption);

    case 'PASS_TURN':
      return handlePassTurn(state);

    case 'RESET':
      return createGameState(action.config, action.players);

    default:
      return state;
  }
}

function handleRollDice(state: GameState, presetValues?: number[]): GameState {
  if (state.turnPhase !== 'waiting_for_roll') return state;

  const diceResult = rollDice(state.config.diceMode, presetValues);
  const extraRoll = grantsExtraRoll(diceResult, state.config.diceMode);

  const newState: GameState = {
    ...state,
    diceValues: diceResult.values,
    diceRemaining: [...diceResult.values],
    turnPhase: 'selecting_piece',
    extraRoll,
    lastAction: `Rolled ${diceResult.values.join(', ')}`,
  };

  // Compute available moves
  const moveOptions = computeMoveOptions(newState);
  newState.moveOptions = moveOptions;

  // If no moves, update lastAction but keep dice visible for UI
  if (moveOptions.length === 0) {
    newState.lastAction = `Rolled ${diceResult.values.join(', ')} — no moves available`;
  }

  return newState;
}

function handleSelectMove(state: GameState, moveOption: MoveOption): GameState {
  if (state.turnPhase !== 'selecting_piece' && state.turnPhase !== 'selecting_split') {
    return state;
  }

  // Apply all moves in the option
  let newState = { ...state };
  for (const move of moveOption.moves) {
    newState = applyMoveToState(newState, move);
  }

  // Check gates after all moves applied to real state
  const gatesOpened = checkGatesOpened(newState);
  newState.gatesOpened = gatesOpened;

  // Remove used dice
  const usedDice = [...moveOption.diceUsed];
  const remaining = state.diceRemaining.filter((_, i) => !usedDice.includes(i));

  // Enhance description with capture info
  const captureMove = moveOption.moves.find(m => m.isCapture);
  let description = moveOption.description;
  if (captureMove) {
    if (captureMove.capturedPieceIds && captureMove.capturedPieceIds.length > 1) {
      description += ` — broke block, captured ${captureMove.capturedPieceIds.map(pieceName).join(' & ')}!`;
    } else if (captureMove.capturedPieceId) {
      description += ` — captured ${pieceName(captureMove.capturedPieceId)}!`;
    }
  }

  // Note if a piece reached home
  const homeMove = moveOption.moves.find(m => m.to.state === 'home');
  if (homeMove) {
    description += ` — ${pieceName(homeMove.pieceId)} reached home!`;
  }

  newState = {
    ...newState,
    diceRemaining: remaining,
    selectedMoves: [...state.selectedMoves, ...moveOption.moves],
    lastAction: description,
  };

  // Check for winner
  const winner = checkWinner(newState);
  if (winner) {
    return {
      ...newState,
      winner,
      turnPhase: 'turn_complete',
      lastAction: `${winner} wins!`,
    };
  }

  // If dice remaining, compute more moves
  if (remaining.length > 0) {
    const moveOptions = computeMoveOptions(newState);
    if (moveOptions.length > 0) {
      return {
        ...newState,
        moveOptions,
        turnPhase: 'selecting_piece',
      };
    }
  }

  // Turn complete — check for extra roll
  if (newState.extraRoll) {
    return {
      ...newState,
      turnPhase: 'waiting_for_roll',
      diceValues: [],
      diceRemaining: [],
      selectedMoves: [],
      moveOptions: [],
      extraRoll: false,
      lastAction: `${newState.lastAction} — extra roll!`,
      turnStartedAt: Date.now(),
    };
  }

  return advanceTurn(newState);
}

function handlePassTurn(state: GameState): GameState {
  if (state.extraRoll) {
    return {
      ...state,
      turnPhase: 'waiting_for_roll',
      diceValues: [],
      diceRemaining: [],
      selectedMoves: [],
      moveOptions: [],
      extraRoll: false,
      turnStartedAt: Date.now(),
    };
  }
  return advanceTurn(state);
}

function advanceTurn(state: GameState): GameState {
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  // In 2-player mode each player has 2 colors that take separate turns.
  // Cycle currentColorIndex after all players have had a turn at the current color.
  let nextColorIndex = state.currentColorIndex;
  if (nextPlayerIndex === 0) {
    const maxColors = state.players[0].colors.length;
    nextColorIndex = (state.currentColorIndex + 1) % maxColors;
  }
  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    currentColorIndex: nextColorIndex,
    turnPhase: 'waiting_for_roll',
    diceValues: [],
    diceRemaining: [],
    selectedMoves: [],
    moveOptions: [],
    extraRoll: false,
    turnCount: state.turnCount + 1,
    turnStartedAt: Date.now(),
  };
}

/** Check if any player has won (all their pieces are home) */
function checkWinner(state: GameState): string | null {
  for (const player of state.players) {
    const allHome = player.colors.every(color => {
      const pieces = getPiecesByColor(state, color);
      return pieces.every(p => p.state === 'home');
    });
    if (allHome) return player.id;
  }
  return null;
}

/** Get the current player */
export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}
