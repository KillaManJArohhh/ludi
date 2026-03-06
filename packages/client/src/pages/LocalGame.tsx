import { useState, useReducer, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import type { GameConfig, Player, MoveOption, PlayerStats } from '@ludi/shared';
import { gameReducer, createGameState, createPlayers } from '@ludi/shared';
import GameSetup from '../components/game/GameSetup.js';
import GameScreen from '../components/game/GameScreen.js';

const STATS_KEY = 'ludi-stats';

type PageState = 'setup' | 'playing';

export default function LocalGame() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('setup');

  const defaultConfig: GameConfig = {
    playerCount: 4,
    diceMode: 'double',
    lockKillsLock: false,
    teamSharing: false,
    turnTimer: 0,
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

  // Save game result to localStorage when game ends
  const savedRef = useRef(false);
  useEffect(() => {
    if (!gameState.winner || savedRef.current) return;
    savedRef.current = true;

    try {
      const raw = localStorage.getItem(STATS_KEY);
      const stats: PlayerStats = raw ? JSON.parse(raw) : {
        gamesPlayed: 0, wins: 0, losses: 0,
        totalCaptures: 0, totalLocksFormed: 0, gameHistory: [],
      };

      const humanPlayer = gameState.players.find(p => !p.isAI);
      if (!humanPlayer) return;

      const isWin = gameState.winner === humanPlayer.id;
      const opponent = gameState.players.find(p => p.id === gameState.winner && p.id !== humanPlayer.id);

      stats.gamesPlayed++;
      if (isWin) stats.wins++;
      else stats.losses++;

      stats.gameHistory.push({
        date: new Date().toLocaleDateString(),
        opponent: isWin ? 'AI' : (opponent?.name || 'AI'),
        result: isWin ? 'win' : 'loss',
        turns: gameState.turnCount,
      });

      // Keep last 50 games
      if (stats.gameHistory.length > 50) {
        stats.gameHistory = stats.gameHistory.slice(-50);
      }

      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {}
  }, [gameState.winner, gameState.players, gameState.turnCount]);

  const handlePlayAgain = useCallback(() => {
    savedRef.current = false;
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
