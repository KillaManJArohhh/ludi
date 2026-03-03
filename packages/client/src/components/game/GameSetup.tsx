import { useState } from 'react';
import type { GameConfig, Player, Color, AIDifficulty } from '@ludi/shared';
import { PLAYER_COLORS, COLOR_HEX, createPlayers } from '@ludi/shared';

interface GameSetupProps {
  onStart: (config: GameConfig, players: Player[]) => void;
  onBack: () => void;
}

export default function GameSetup({ onStart, onBack }: GameSetupProps) {
  const [playerCount, setPlayerCount] = useState<2 | 4>(4);
  const [diceMode, setDiceMode] = useState<'single' | 'double'>('double');
  const [lockKillsLock, setLockKillsLock] = useState(false);
  const [teamSharing, setTeamSharing] = useState(false);

  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  const [aiSettings, setAiSettings] = useState<(AIDifficulty | null)[]>([null, null, null, null]);

  const handleStart = () => {
    const config: GameConfig = { playerCount, diceMode, lockKillsLock, teamSharing };
    const basePlayers = createPlayers(config);

    const players = basePlayers.map((p, i) => ({
      ...p,
      name: playerNames[i] || p.name,
      isAI: aiSettings[i] !== null,
      aiDifficulty: aiSettings[i] || undefined,
    }));

    onStart(config, players);
  };

  const toggleAI = (index: number) => {
    const next = [...aiSettings];
    if (next[index] === null) {
      next[index] = 'medium';
    } else {
      next[index] = null;
    }
    setAiSettings(next);
  };

  const setAIDifficulty = (index: number, diff: AIDifficulty) => {
    const next = [...aiSettings];
    next[index] = diff;
    setAiSettings(next);
  };

  const slotsToShow = playerCount === 4 ? 4 : 2;
  const slotColors: Color[][] = playerCount === 4
    ? PLAYER_COLORS.map(c => [c])
    : [['red', 'yellow'], ['green', 'blue']];

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="font-[Playfair_Display] text-2xl font-bold text-gold mb-8 text-center tracking-wide">
        Game Setup
      </h2>

      {/* Player Count */}
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

      {/* Dice Mode */}
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

      {/* Rule Toggles */}
      <div className="mb-5 space-y-3">
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
        {playerCount === 2 && (
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={teamSharing}
              onChange={e => setTeamSharing(e.target.checked)}
              className="w-4 h-4 rounded accent-[#009B3A]"
            />
            <span className="text-sm text-[#f0ece4]/80 group-hover:text-[#f0ece4] transition-colors">
              Team Sharing <span className="text-[#C4A35A]/50 text-xs">(allies share spaces)</span>
            </span>
          </label>
        )}
      </div>

      {/* Player Slots */}
      <div className="mb-8 space-y-2">
        <label className="block text-xs text-[#C4A35A]/80 mb-2 font-semibold tracking-wide uppercase">
          Players
        </label>
        {Array.from({ length: slotsToShow }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 glass-panel rounded-lg p-2.5 border border-[#C4A35A]/25"
          >
            <div className="flex gap-1">
              {slotColors[i].map(color => (
                <div
                  key={color}
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{
                    backgroundColor: COLOR_HEX[color],
                    boxShadow: `0 0 6px ${COLOR_HEX[color]}40`,
                  }}
                />
              ))}
            </div>
            <input
              type="text"
              value={playerNames[i]}
              onChange={e => {
                const next = [...playerNames];
                next[i] = e.target.value;
                setPlayerNames(next);
              }}
              className="flex-1 bg-transparent text-sm text-[#f0ece4] outline-none px-2 py-1
                         placeholder:text-[#C4A35A]/40 border-b border-[#C4A35A]/15 focus:border-[#C4A35A]/40"
              placeholder={`Player ${i + 1}`}
            />
            <button
              onClick={() => toggleAI(i)}
              className={`text-[10px] px-2.5 py-1 rounded font-semibold tracking-wide transition-all
                ${aiSettings[i] !== null
                  ? 'bg-[#C4A35A]/20 text-[#FED100] border border-[#C4A35A]/30'
                  : 'bg-white/[0.08] text-[#f0ece4]/60 border border-[#C4A35A]/20 hover:bg-white/[0.12] hover:text-[#f0ece4]/80'
                }`}
            >
              {aiSettings[i] !== null ? 'AI' : 'Human'}
            </button>
            {aiSettings[i] !== null && (
              <select
                value={aiSettings[i]!}
                onChange={e => setAIDifficulty(i, e.target.value as AIDifficulty)}
                className="text-[10px] bg-white/[0.1] text-[#f0ece4]/90 rounded px-2 py-1
                           outline-none border border-[#C4A35A]/25"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg btn-secondary text-[#C4A35A] font-medium
                     hover:text-[#FED100] transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleStart}
          className="flex-1 py-3 rounded-lg btn-primary text-white font-bold tracking-wide"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
