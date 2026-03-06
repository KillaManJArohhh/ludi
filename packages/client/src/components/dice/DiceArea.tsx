import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState } from '@ludi/shared';
import { audioManager } from '../../services/audioManager.js';
import Die from './Die.js';

interface DiceAreaProps {
  state: GameState;
  onRoll: () => void;
  onPass: () => void;
  canRoll: boolean;
  canPass: boolean;
  timeRemaining?: number | null; // seconds left, null/undefined = no timer
  onDiceSettled?: (values: number[]) => void; // called after dice finish animating
}

export default function DiceArea({ state, onRoll, onPass, canRoll, canPass, timeRemaining, onDiceSettled }: DiceAreaProps) {
  const [rolling, setRolling] = useState(false);
  const [displayValues, setDisplayValues] = useState<number[]>(state.diceValues);
  const prevDiceRef = useRef<number[]>([]);
  const localRollRef = useRef(false);

  const handleRoll = useCallback(() => {
    if (!canRoll || rolling) return;
    localRollRef.current = true;
    setRolling(true);
    audioManager.play('dice-roll');

    setTimeout(() => {
      setRolling(false);
      onRoll();
    }, 800);
  }, [canRoll, rolling, onRoll]);

  // Animate dice when new values arrive from opponent (skip if local roll)
  useEffect(() => {
    const prev = prevDiceRef.current;
    prevDiceRef.current = state.diceValues;

    if (state.diceValues.length === 0) {
      setDisplayValues([]);
      return;
    }

    const changed = state.diceValues.length !== prev.length ||
      state.diceValues.some((v, i) => v !== prev[i]);

    if (changed && localRollRef.current) {
      // Local roll — sound already played, just show values
      localRollRef.current = false;
      setDisplayValues(state.diceValues);
      // Small delay to let Die component's internal effect update before notification
      setTimeout(() => onDiceSettled?.(state.diceValues), 50);
    } else if (changed) {
      // Remote roll — play sound + animate
      setRolling(true);
      audioManager.play('dice-roll');
      setTimeout(() => {
        setRolling(false);
        setDisplayValues(state.diceValues);
        onDiceSettled?.(state.diceValues);
      }, 600);
    } else {
      setDisplayValues(state.diceValues);
    }
  }, [state.diceValues]);

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
  const hasValues = displayValues.length > 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dice display */}
      <div className="flex gap-4 items-center justify-center">
        {Array.from({ length: diceCount }, (_, i) => (
          <Die
            key={i}
            value={hasValues ? displayValues[i] : null}
            rolling={rolling}
            used={hasValues && !state.diceRemaining.includes(displayValues[i])}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {canRoll && (
          <button
            onClick={handleRoll}
            disabled={rolling}
            className="btn-primary px-8 py-2.5 min-h-[48px] rounded-lg text-white font-bold text-sm tracking-wide
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {rolling ? 'Rolling...' : 'Roll Dice'}
          </button>
        )}
        {canPass && (
          <button
            onClick={onPass}
            className="btn-secondary px-5 py-2.5 min-h-[48px] rounded-lg text-[#C4A35A]/70 font-medium text-sm
                       hover:text-[#C4A35A] transition-colors"
          >
            Pass Turn
          </button>
        )}
      </div>

      {/* Turn timer countdown */}
      {timeRemaining != null && timeRemaining >= 0 && (
        <div className={`text-sm font-bold tracking-wide ${timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-[#C4A35A]/70'}`}>
          {timeRemaining}s
        </div>
      )}

    </div>
  );
}
