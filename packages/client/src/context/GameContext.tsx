import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { GameState, GameAction, GameConfig, Player, MoveOption } from '@ludi/shared';
import { gameReducer, createGameState, createPlayers, getCurrentPlayer } from '@ludi/shared';

interface GameContextValue {
  state: GameState;
  dispatch: (action: GameAction) => void;
  rollDice: () => void;
  selectMove: (option: MoveOption) => void;
  passTurn: () => void;
  resetGame: (config: GameConfig, players?: Player[]) => void;
  currentPlayer: Player;
  isCurrentPlayerHuman: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const defaultConfig: GameConfig = {
    playerCount: 4,
    diceMode: 'double',
    lockKillsLock: false,
    teamSharing: false,
  };

  const [state, dispatch] = useReducer(gameReducer, createGameState(defaultConfig, createPlayers(defaultConfig)));

  const rollDice = useCallback(() => {
    dispatch({ type: 'ROLL_DICE' });
  }, []);

  const selectMove = useCallback((option: MoveOption) => {
    dispatch({ type: 'SELECT_MOVE', moveOption: option });
  }, []);

  const passTurn = useCallback(() => {
    dispatch({ type: 'PASS_TURN' });
  }, []);

  const resetGame = useCallback((config: GameConfig, players?: Player[]) => {
    dispatch({ type: 'RESET', config, players: players || createPlayers(config) });
  }, []);

  const currentPlayer = getCurrentPlayer(state);
  const isCurrentPlayerHuman = !currentPlayer.isAI;

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        rollDice,
        selectMove,
        passTurn,
        resetGame,
        currentPlayer,
        isCurrentPlayerHuman,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
