import { useEffect, useState, useRef } from 'react';
import type { GameState, MoveOption } from '@ludi/shared';
import { selectAIMove, getAIDelay, getCurrentPlayer, COLOR_HEX, getActiveColors, getPiecesByColor } from '@ludi/shared';
import { audioManager } from '../../services/audioManager.js';
import LudiBoard from '../board/LudiBoard.js';
import DiceArea from '../dice/DiceArea.js';
import PlayerPanel from './PlayerPanel.js';
import TurnIndicator from './TurnIndicator.js';
import MoveOptions from './MoveOptions.js';
import GameOverModal from './GameOverModal.js';

interface GameNotification {
  type: 'roll' | 'capture' | 'no_moves' | 'home' | 'exit_base';
  playerName: string;
  color: string;
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
}

export default function GameScreen({
  state,
  onRoll,
  onSelectMove,
  onPass,
  onPlayAgain,
  onHome,
  localPlayerId,
}: GameScreenProps) {
  const currentPlayer = getCurrentPlayer(state);
  const isLocalTurn = localPlayerId ? currentPlayer.id === localPlayerId : true;
  const canRoll = state.turnPhase === 'waiting_for_roll' && !currentPlayer.isAI && isLocalTurn;
  const canPass = state.turnPhase === 'selecting_piece' && state.moveOptions.length === 0 && !currentPlayer.isAI && isLocalTurn;
  const showMoveOptions = state.turnPhase === 'selecting_piece' && state.moveOptions.length > 1 && !currentPlayer.isAI && isLocalTurn;

  // General notification state
  const [notification, setNotification] = useState<GameNotification | null>(null);
  const prevLastActionRef = useRef<string | null>(null);
  const prevPlayerIndexRef = useRef<number>(state.currentPlayerIndex);

  // Watch lastAction changes to trigger notifications
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

    // Roll notification (including no-moves rolls)
    if (lastAction.startsWith('Rolled')) {
      const noMoves = lastAction.includes('no moves');
      // Prefer state.diceValues for consistency with DiceArea; parse from lastAction
      // as fallback when state.diceValues is cleared (auto-pass on no moves)
      let diceValues = state.diceValues;
      if (diceValues.length === 0) {
        const match = lastAction.match(/Rolled ([\d, ]+)/);
        diceValues = match
          ? match[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
          : [];
      }
      setNotification({
        type: noMoves ? 'no_moves' : 'roll',
        playerName: player.name,
        color,
        message: `${player.name} rolled`,
        detail: noMoves ? 'No moves available' : undefined,
        diceValues,
      });
      const timer = setTimeout(() => setNotification(null), 2000);
      return () => clearTimeout(timer);
    }

    // Capture notification
    if (lastAction.includes('captured')) {
      audioManager.play('capture');
      setNotification({
        type: 'capture',
        playerName: player.name,
        color,
        message: `${player.name} captured!`,
        detail: lastAction,
      });
      const timer = setTimeout(() => setNotification(null), 2500);
      return () => clearTimeout(timer);
    }

    // Home notification
    if (lastAction.includes('reached home')) {
      audioManager.play('piece-home');
      setNotification({
        type: 'home',
        playerName: player.name,
        color,
        message: 'Piece reached home!',
        detail: lastAction,
      });
      const timer = setTimeout(() => setNotification(null), 2500);
      return () => clearTimeout(timer);
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

  // Auto-move only when the player has exactly one piece on the board
  // (active on circuit or home stretch — not in base or home) and there's
  // at least one legal move. With only one piece out there's no piece choice.
  useEffect(() => {
    if (currentPlayer.isAI || state.winner) return;
    if (!isLocalTurn) return;
    if (state.turnPhase !== 'selecting_piece') return;
    if (state.moveOptions.length === 0) return;

    const activeColors = getActiveColors(state);
    const activePieces = activeColors
      .flatMap(c => getPiecesByColor(state, c))
      .filter(p => p.state === 'active');

    // Only auto-move if exactly 1 piece is active AND there's exactly 1 option
    if (activePieces.length !== 1 || state.moveOptions.length !== 1) return;

    const timer = setTimeout(() => {
      onSelectMove(state.moveOptions[0]);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentPlayer.isAI, isLocalTurn, state.winner, state.turnPhase, state.moveOptions, onSelectMove]);

  const winnerPlayer = state.winner
    ? state.players.find(p => p.id === state.winner)
    : null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start justify-center p-4 min-h-screen">
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
          onSelectMove={onSelectMove}
          interactive={!currentPlayer.isAI && isLocalTurn}
        />

        {/* Mobile player panels */}
        <div className="flex lg:hidden gap-2 w-full overflow-x-auto">
          {state.players.map((p, i) => (
            <div key={p.id} className="flex-shrink-0 w-40">
              <PlayerPanel
                player={p}
                state={state}
                isActive={state.currentPlayerIndex === i}
              />
            </div>
          ))}
        </div>

        <DiceArea
          state={state}
          onRoll={onRoll}
          onPass={onPass}
          canRoll={canRoll}
          canPass={canPass}
        />

        {showMoveOptions && (
          <MoveOptions
            options={state.moveOptions}
            onSelect={onSelectMove}
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

      {/* Game notification */}
      {notification && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
          <div
            className="glass-panel rounded-2xl px-8 py-5 flex flex-col items-center gap-3 border animate-fade-in"
            style={{
              borderColor: `${notification.color}50`,
              boxShadow: `0 0 40px ${notification.color}15, 0 8px 32px rgba(0,0,0,0.4)`,
            }}
          >
            <span className="text-sm font-semibold text-[#f0ece4]/80 tracking-wide">
              {notification.message}
            </span>
            {(notification.type === 'roll' || notification.type === 'no_moves') && notification.diceValues && notification.diceValues.length > 0 && (
              <div className="flex gap-4">
                {notification.diceValues.map((v, i) => (
                  <span
                    key={i}
                    className="text-4xl font-bold font-[Playfair_Display]"
                    style={{ color: notification.color, textShadow: `0 0 12px ${notification.color}40` }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}
            {notification.type === 'capture' && (
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="#DC2626" strokeWidth="2" opacity="0.6" />
                <path d="M10 10 L22 22 M22 10 L10 22" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
            {notification.type === 'home' && (
              <svg width="32" height="32" viewBox="0 0 32 32">
                <path d="M16 4 L28 14 L24 14 L24 26 L8 26 L8 14 L4 14 Z" fill="#FED100" opacity="0.7" />
                <rect x="13" y="18" width="6" height="8" fill="#0d0805" opacity="0.6" rx="1" />
              </svg>
            )}
            {notification.detail && (
              <span className="text-[11px] text-[#C4A35A]/40 font-medium">{notification.detail}</span>
            )}
          </div>
        </div>
      )}

      {/* Victory modal */}
      {winnerPlayer && (
        <GameOverModal
          winner={winnerPlayer}
          turnCount={state.turnCount}
          onPlayAgain={onPlayAgain}
          onHome={onHome}
        />
      )}
    </div>
  );
}
