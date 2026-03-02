import { useState, useCallback, useEffect } from 'react';
import type { GameState } from '@ludi/shared';
import { audioManager } from '../../services/audioManager.js';
import Die from './Die.js';

interface DiceAreaProps {
  state: GameState;
  onRoll: () => void;
  onPass: () => void;
  canRoll: boolean;
  canPass: boolean;
}

export default function DiceArea({ state, onRoll, onPass, canRoll, canPass }: DiceAreaProps) {
  const [rolling, setRolling] = useState(false);

  const handleRoll = useCallback(() => {
    if (!canRoll || rolling) return;
    setRolling(true);
    audioManager.play('dice-roll');

    setTimeout(() => {
      setRolling(false);
      onRoll();
    }, 800);
  }, [canRoll, rolling, onRoll]);

  // Spacebar to roll dice
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleRoll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRoll]);

  const diceCount = state.config.diceMode === 'double' ? 2 : 1;
  const hasValues = state.diceValues.length > 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dice display */}
      <div className="flex gap-4 items-center justify-center">
        {Array.from({ length: diceCount }, (_, i) => (
          <Die
            key={i}
            value={hasValues ? state.diceValues[i] : null}
            rolling={rolling}
            used={hasValues && !state.diceRemaining.includes(state.diceValues[i])}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {canRoll && (
          <button
            onClick={handleRoll}
            disabled={rolling}
            className="btn-primary px-8 py-2.5 rounded-lg text-white font-bold text-sm tracking-wide
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {rolling ? 'Rolling...' : 'Roll Dice'}
          </button>
        )}
        {canPass && (
          <button
            onClick={onPass}
            className="btn-secondary px-5 py-2.5 rounded-lg text-[#C4A35A]/70 font-medium text-sm
                       hover:text-[#C4A35A] transition-colors"
          >
            Pass Turn
          </button>
        )}
      </div>

      {/* Last action info */}
      {state.lastAction && (
        <p className="text-[11px] text-[#C4A35A]/30 text-center font-medium">
          {state.lastAction}
        </p>
      )}
    </div>
  );
}
