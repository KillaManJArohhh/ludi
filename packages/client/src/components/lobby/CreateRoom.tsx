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

  const handleCreate = () => {
    onCreated({
      playerCount,
      diceMode,
      lockKillsLock,
      teamSharing: false,
    });
  };

  return (
    <div className="max-w-sm mx-auto p-6">
      <h3 className="font-[Playfair_Display] text-xl font-bold text-gold mb-6 text-center tracking-wide">
        Create Room
      </h3>

      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-[11px] text-[#C4A35A]/50 mb-2 font-medium tracking-wide uppercase">
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
                    : 'bg-white/[0.04] text-[#C4A35A]/50 border border-white/[0.06] hover:bg-white/[0.08] hover:text-[#C4A35A]/70'
                  }`}
              >
                {n} Players
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[#C4A35A]/50 mb-2 font-medium tracking-wide uppercase">
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
                    : 'bg-white/[0.04] text-[#C4A35A]/50 border border-white/[0.06] hover:bg-white/[0.08] hover:text-[#C4A35A]/70'
                  }`}
              >
                {mode === 'single' ? '1 Die' : '2 Dice'}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={lockKillsLock}
            onChange={e => setLockKillsLock(e.target.checked)}
            className="w-4 h-4 rounded accent-[#009B3A]"
          />
          <span className="text-sm text-[#f0ece4]/60 group-hover:text-[#f0ece4]/80 transition-colors">
            Lock Kills Lock
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg btn-secondary text-[#C4A35A]/60 font-medium
                     hover:text-[#C4A35A] transition-colors"
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
