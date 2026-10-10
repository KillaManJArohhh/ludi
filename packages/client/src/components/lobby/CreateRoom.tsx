import { useState } from 'react';
import type { GameConfig } from '@ludi/shared';

interface CreateRoomProps {
  onCreated: (config: GameConfig) => void;
  onBack: () => void;
}

export default function CreateRoom({ onCreated, onBack }: CreateRoomProps) {
  const [playerCount, setPlayerCount] = useState<2 | 4>(4);
  const [diceMode, setDiceMode] = useState<'single' | 'double'>('double');
  const [lockKillsLock, setLockKillsLock] = useState(false);
  const [turnTimer, setTurnTimer] = useState(0);

  const handleCreate = () => {
    onCreated({
      playerCount,
      diceMode,
      lockKillsLock,
      teamSharing: false,
      turnTimer,
    });
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="font-[Playfair_Display] text-2xl font-bold text-gold mb-8 text-center tracking-wide">
        Create Room
      </h2>

      <div className="mb-5">
        <label className="block text-xs text-[#C4A35A]/80 mb-2 font-semibold tracking-wide uppercase">
          Players
        </label>
        <div className="flex gap-2">
          {([2, 4] as const).map(n => (
            <button
              key={n}
              onClick={() => setPlayerCount(n)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all
                ${playerCount === n
                  ? 'btn-primary text-white'
                  : 'bg-white/[0.08] text-[#f0ece4]/70 border border-[#C4A35A]/25 hover:bg-white/[0.12] hover:text-[#f0ece4]/90'
                }`}
            >
              {n} Players
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs text-[#C4A35A]/80 mb-2 font-semibold tracking-wide uppercase">
          Dice
        </label>
        <div className="flex gap-2">
          {(['single', 'double'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setDiceMode(mode)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all
                ${diceMode === mode
                  ? 'btn-primary text-white'
                  : 'bg-white/[0.08] text-[#f0ece4]/70 border border-[#C4A35A]/25 hover:bg-white/[0.12] hover:text-[#f0ece4]/90'
                }`}
            >
              {mode === 'single' ? '1 Die' : '2 Dice'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs text-[#C4A35A]/80 mb-2 font-semibold tracking-wide uppercase">
          Turn Timer
        </label>
        <div className="flex gap-2">
          {([0, 15, 30, 60] as const).map(seconds => (
            <button
              key={seconds}
              onClick={() => setTurnTimer(seconds)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all
                ${turnTimer === seconds
                  ? 'btn-primary text-white'
                  : 'bg-white/[0.08] text-[#f0ece4]/70 border border-[#C4A35A]/25 hover:bg-white/[0.12] hover:text-[#f0ece4]/90'
                }`}
            >
              {seconds === 0 ? 'Off' : `${seconds}s`}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={lockKillsLock}
            onChange={e => setLockKillsLock(e.target.checked)}
            className="w-4 h-4 rounded accent-[#009B3A]"
          />
          <span className="text-sm text-[#f0ece4]/80 group-hover:text-[#f0ece4] transition-colors">
            Lock Kills Lock <span className="text-[#C4A35A]/50 text-xs">(doubles on opponent block)</span>
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg btn-secondary text-[#C4A35A] font-medium
                     hover:text-[#FED100] transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleCreate}
          className="flex-1 py-3 rounded-lg btn-primary text-white font-bold tracking-wide"
        >
          Create
        </button>
      </div>
    </div>
  );
}
