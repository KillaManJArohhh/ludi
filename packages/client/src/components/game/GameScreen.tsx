import { useEffect, useState, useRef, useCallback } from 'react';
import type { GameState, MoveOption, Color } from '@ludi/shared';
import { selectAIMove, getAIDelay, getCurrentPlayer, COLOR_HEX, getActiveColors, getPiecesByColor } from '@ludi/shared';
import { audioManager } from '../../services/audioManager.js';
import LudiBoard from '../board/LudiBoard.js';
import DiceArea from '../dice/DiceArea.js';
import PlayerPanel from './PlayerPanel.js';
import TurnIndicator from './TurnIndicator.js';
import MoveOptions from './MoveOptions.js';
import GameOverModal from './GameOverModal.js';
import SoundToggle from '../ui/SoundToggle.js';

export interface GameNotification {
  type: 'roll' | 'capture' | 'no_moves' | 'home' | 'exit_base';
  playerName: string;
  color: string;
  playerColor: Color; // which color's base to render in
  message: string;
  detail?: string;
  diceValues?: number[];
}

interface GameScreenProps {
  state: GameState;
  onRoll: () => void;
  onSelectMove: (option: MoveOption) => void;
  onPass: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
  localPlayerId?: string;
  onRematch?: () => void;
}

export default function GameScreen({
  state,
  onRoll,
  onSelectMove,
  onPass,
  onPlayAgain,
  onHome,
  localPlayerId,
  onRematch,
}: GameScreenProps) {
  const currentPlayer = getCurrentPlayer(state);
  const isLocalTurn = localPlayerId ? currentPlayer.id === localPlayerId : true;
  const canRoll = state.turnPhase === 'waiting_for_roll' && !currentPlayer.isAI && isLocalTurn;
  const canPass = state.turnPhase === 'selecting_piece' && state.moveOptions.length === 0 && !currentPlayer.isAI && isLocalTurn;
  const showMoveOptions = state.turnPhase === 'selecting_piece' && state.moveOptions.length > 1 && !currentPlayer.isAI && isLocalTurn;

  // Turn timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerAutoPassedRef = useRef(false);

  useEffect(() => {
    const timerSeconds = state.config.turnTimer;
    if (!timerSeconds || state.winner) {
      setTimeRemaining(null);
      return;
    }

    // Reset auto-pass flag on each new turn start
    timerAutoPassedRef.current = false;

    const tick = () => {
      const elapsed = (Date.now() - state.turnStartedAt) / 1000;
      const remaining = Math.max(0, Math.ceil(timerSeconds - elapsed));
      setTimeRemaining(remaining);

      if (remaining <= 0 && !timerAutoPassedRef.current && isLocalTurn && !currentPlayer.isAI) {
        timerAutoPassedRef.current = true;
        if (state.turnPhase === 'waiting_for_roll') {
          onRoll();
        } else if (state.turnPhase === 'selecting_piece' && state.moveOptions.length > 0) {
          const randomMove = state.moveOptions[Math.floor(Math.random() * state.moveOptions.length)];
          onSelectMove(randomMove);
        } else {
          onPass();
        }
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [state.turnStartedAt, state.config.turnTimer, state.winner, state.turnPhase, state.moveOptions, isLocalTurn, currentPlayer.isAI, onRoll, onSelectMove, onPass]);

  // Play turn-start sound when it becomes local player's turn
  const prevTurnIndexRef = useRef(state.currentPlayerIndex);
  useEffect(() => {
    if (prevTurnIndexRef.current !== state.currentPlayerIndex) {
      prevTurnIndexRef.current = state.currentPlayerIndex;
      if (isLocalTurn && !currentPlayer.isAI) {
        audioManager.play('turn-start');
      }
    }
  }, [state.currentPlayerIndex, isLocalTurn, currentPlayer.isAI]);

  // Wrap onSelectMove to play piece-move sound
  const handleSelectMove = (option: MoveOption) => {
    audioManager.play('piece-move');
    onSelectMove(option);
  };

  // General notification state
  const [notification, setNotification] = useState<GameNotification | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevLastActionRef = useRef<string | null>(null);
  const prevPlayerIndexRef = useRef<number>(state.currentPlayerIndex);

  // Roll notification — triggered by DiceArea after dice finish animating
  const handleDiceSettled = useCallback((values: number[]) => {
    const player = state.players[state.currentPlayerIndex];
    if (!player || values.length === 0) return;
    const color = COLOR_HEX[player.colors[0]];
    const pColor = player.colors[0];
    const noMoves = state.turnPhase === 'selecting_piece' && state.moveOptions.length === 0;

    clearTimeout(notifTimerRef.current);
    setNotification({
      type: noMoves ? 'no_moves' : 'roll',
      playerName: player.name,
      color,
      playerColor: pColor,
      message: `${player.name} rolled`,
      detail: noMoves ? 'No moves available' : undefined,
      diceValues: values,
    });
    notifTimerRef.current = setTimeout(() => setNotification(null), 2000);
  }, [state.players, state.currentPlayerIndex, state.turnPhase, state.moveOptions.length]);

  // Watch lastAction changes for capture/home notifications (not rolls)
  useEffect(() => {
    const lastAction = state.lastAction;
    if (lastAction === prevLastActionRef.current) return;
    const playerIndex = prevPlayerIndexRef.current;
    prevLastActionRef.current = lastAction;
    prevPlayerIndexRef.current = state.currentPlayerIndex;
    if (!lastAction) return;

    const player = state.players[playerIndex];
    if (!player) return;
    const color = COLOR_HEX[player.colors[0]];
    const pColor = player.colors[0];

    // Capture notification
    if (lastAction.includes('captured')) {
      audioManager.play('capture');
      clearTimeout(notifTimerRef.current);
      setNotification({
        type: 'capture',
        playerName: player.name,
        color,
        playerColor: pColor,
        message: `${player.name} captured!`,
        detail: lastAction,
      });
      notifTimerRef.current = setTimeout(() => setNotification(null), 2500);
      return;
    }

    // Home notification
    if (lastAction.includes('reached home')) {
      audioManager.play('piece-home');
      clearTimeout(notifTimerRef.current);
      setNotification({
        type: 'home',
        playerName: player.name,
        color,
        playerColor: pColor,
        message: 'Piece reached home!',
        detail: lastAction,
      });
      notifTimerRef.current = setTimeout(() => setNotification(null), 2500);
      return;
    }
  }, [state.lastAction, state.currentPlayerIndex, state.players]);

  // AI turn handling (skip in online mode — server handles AI)
  useEffect(() => {
    if (localPlayerId) return;
    if (!currentPlayer.isAI || state.winner) return;

    const difficulty = currentPlayer.aiDifficulty || 'medium';

    if (state.turnPhase === 'waiting_for_roll') {
      const delay = getAIDelay(difficulty) * 0.5;
      const timer = setTimeout(() => {
        audioManager.play('dice-roll');
        onRoll();
      }, delay);
      return () => clearTimeout(timer);
    }

    if (state.turnPhase === 'selecting_piece') {
      if (state.moveOptions.length === 0) {
        const timer = setTimeout(() => onPass(), 500);
        return () => clearTimeout(timer);
      }

      const delay = getAIDelay(difficulty);
      const timer = setTimeout(() => {
        const move = selectAIMove(state, difficulty);
        if (move) onSelectMove(move);
        else onPass();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [localPlayerId, currentPlayer, state.turnPhase, state.moveOptions, state.winner, onRoll, onSelectMove, onPass]);

  // Auto-move only when exactly 1 piece is on the board and there's 1 option.
  // 2+ pieces: player always chooses manually, no exceptions.
  useEffect(() => {
    if (currentPlayer.isAI || state.winner) return;
    if (!isLocalTurn) return;
    if (state.turnPhase !== 'selecting_piece') return;

    const activeColors = getActiveColors(state);
    const activePieces = activeColors
      .flatMap(c => getPiecesByColor(state, c))
      .filter(p => p.state === 'active');
    if (state.moveOptions.length !== 1) return;
    if (activePieces.length !== 1) return;

    const timer = setTimeout(() => {
      onSelectMove(state.moveOptions[0]);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentPlayer.isAI, isLocalTurn, state.winner, state.turnPhase, state.moveOptions, onSelectMove]);

  const winnerPlayer = state.winner
    ? state.players.find(p => p.id === state.winner)
    : null;

  // Play victory fanfare when game is won
  const prevWinnerRef = useRef(state.winner);
  useEffect(() => {
    if (state.winner && !prevWinnerRef.current) {
      audioManager.play('victory');
    }
    prevWinnerRef.current = state.winner;
  }, [state.winner]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start justify-center p-4 min-h-screen relative">
      {/* Sound toggle */}
      <div className="absolute top-4 right-4 z-30">
        <SoundToggle />
      </div>

      {/* Left panel: player info (desktop) */}
      <div className="hidden lg:flex flex-col gap-2 w-48">
        {state.players.slice(0, Math.ceil(state.players.length / 2)).map((p, i) => (
          <PlayerPanel
            key={p.id}
            player={p}
            state={state}
            isActive={state.currentPlayerIndex === i}
          />
        ))}
      </div>

      {/* Center: Board + Controls */}
      <div className="flex flex-col items-center gap-4 w-full max-w-[540px]">
        <TurnIndicator
          player={currentPlayer}
          turnCount={state.turnCount}
          activeColor={currentPlayer.colors.length > 1 ? currentPlayer.colors[state.currentColorIndex] : undefined}
        />

        <LudiBoard
          state={state}
          onSelectMove={handleSelectMove}
          interactive={!currentPlayer.isAI && isLocalTurn}
          notification={notification}
        />

        {/* Mobile player panels */}
        <div className="flex lg:hidden gap-2 w-full overflow-x-auto">
          {state.players.map((p, i) => {
            const isActive = state.currentPlayerIndex === i;
            return (
              <div
                key={p.id}
                className="flex-shrink-0 w-40"
                ref={el => {
                  if (isActive && el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }
                }}
              >
                <PlayerPanel
                  player={p}
                  state={state}
                  isActive={isActive}
                />
              </div>
            );
          })}
        </div>

        <DiceArea
          state={state}
          onRoll={onRoll}
          onPass={onPass}
          canRoll={canRoll}
          canPass={canPass}
          timeRemaining={timeRemaining}
          onDiceSettled={handleDiceSettled}
        />

        {showMoveOptions && (
          <MoveOptions
            options={state.moveOptions}
            onSelect={handleSelectMove}
          />
        )}

      </div>

      {/* Right panel: player info (desktop) */}
      <div className="hidden lg:flex flex-col gap-2 w-48">
        {state.players.slice(Math.ceil(state.players.length / 2)).map((p, i) => {
          const actualIndex = Math.ceil(state.players.length / 2) + i;
          return (
            <PlayerPanel
              key={p.id}
              player={p}
              state={state}
              isActive={state.currentPlayerIndex === actualIndex}
            />
          );
        })}
      </div>

      {/* Victory modal */}
      {winnerPlayer && (
        <GameOverModal
          winner={winnerPlayer}
          turnCount={state.turnCount}
          onPlayAgain={onPlayAgain}
          onHome={onHome}
          onRematch={onRematch}
        />
      )}
    </div>
  );
}
