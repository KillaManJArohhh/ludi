import { useReducer, useCallback } from 'react';
import type { GameConfig, Player, MoveOption } from '@ludi/shared';
import { gameReducer, createGameState, createPlayers } from '@ludi/shared';

export function useGame(config?: GameConfig) {
  const defaultConfig: GameConfig = config || {
    playerCount: 4,
    diceMode: 'double',
    lockKillsLock: false,
    teamSharing: false,
    turnTimer: 0,
  };

  const [state, dispatch] = useReducer(
    gameReducer,
    createGameState(defaultConfig, createPlayers(defaultConfig))
  );

  const rollDice = useCallback(() => {
    dispatch({ type: 'ROLL_DICE' });
  }, []);

  const selectMove = useCallback((option: MoveOption) => {
    dispatch({ type: 'SELECT_MOVE', moveOption: option });
  }, []);

  const passTurn = useCallback(() => {
    dispatch({ type: 'PASS_TURN' });
  }, []);

  const resetGame = useCallback((newConfig: GameConfig, players?: Player[]) => {
    dispatch({ type: 'RESET', config: newConfig, players: players || createPlayers(newConfig) });
  }, []);

  return { state, dispatch, rollDice, selectMove, passTurn, resetGame };
}
