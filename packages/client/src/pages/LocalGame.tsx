import { useState, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router';
import type { GameConfig, Player, MoveOption } from '@ludi/shared';
import { gameReducer, createGameState, createPlayers } from '@ludi/shared';
import GameSetup from '../components/game/GameSetup.js';
import GameScreen from '../components/game/GameScreen.js';

type PageState = 'setup' | 'playing';

export default function LocalGame() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('setup');

  const defaultConfig: GameConfig = {
    playerCount: 4,
    diceMode: 'double',
    lockKillsLock: false,
    teamSharing: false,
  };

  const [gameState, dispatch] = useReducer(
    gameReducer,
    createGameState(defaultConfig, createPlayers(defaultConfig))
  );

  const handleStart = useCallback((config: GameConfig, players: Player[]) => {
    dispatch({ type: 'RESET', config, players });
    setPageState('playing');
  }, []);

  const handleRoll = useCallback(() => {
    dispatch({ type: 'ROLL_DICE' });
  }, []);

  const handleSelectMove = useCallback((option: MoveOption) => {
    dispatch({ type: 'SELECT_MOVE', moveOption: option });
  }, []);

  const handlePass = useCallback(() => {
    dispatch({ type: 'PASS_TURN' });
  }, []);

  const handlePlayAgain = useCallback(() => {
    dispatch({
      type: 'RESET',
      config: gameState.config,
      players: gameState.players.map(p => ({ ...p })),
    });
  }, [gameState.config, gameState.players]);

  if (pageState === 'setup') {
    return <GameSetup onStart={handleStart} onBack={() => navigate('/')} />;
  }

  return (
    <GameScreen
      state={gameState}
      onRoll={handleRoll}
      onSelectMove={handleSelectMove}
      onPass={handlePass}
      onPlayAgain={handlePlayAgain}
      onHome={() => navigate('/')}
    />
  );
}
