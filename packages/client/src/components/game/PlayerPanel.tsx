import type { Player, GameState } from '@ludi/shared';
import { COLOR_HEX, getPiecesByColor } from '@ludi/shared';

interface PlayerPanelProps {
  player: Player;
  state: GameState;
  isActive: boolean;
}

export default function PlayerPanel({ player, state, isActive }: PlayerPanelProps) {
  const stats = player.colors.map(color => {
    const pieces = getPiecesByColor(state, color);
    return {
      color,
      inBase: pieces.filter(p => p.state === 'base').length,
      active: pieces.filter(p => p.state === 'active').length,
      home: pieces.filter(p => p.state === 'home').length,
    };
  });

  return (
    <div
      className={`rounded-lg p-3 transition-all duration-300 ${
        isActive
          ? 'glass-panel border-[#FED100]/30 active-player'
          : 'bg-white/[0.03] border border-white/[0.06]'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1">
          {player.colors.map(color => (
            <div
              key={color}
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: COLOR_HEX[color],
                boxShadow: isActive ? `0 0 6px ${COLOR_HEX[color]}50` : 'none',
              }}
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-[#f0ece4]">
          {player.name}
        </span>
        {player.isAI && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C4A35A]/10 text-[#C4A35A]/60 font-medium tracking-wide">
            AI
          </span>
        )}
      </div>
      <div className="flex gap-3 text-[10px]">
        {stats.map(s => (
          <div key={s.color} className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: COLOR_HEX[s.color] }}
            />
            <span className="text-[#C4A35A]/40 font-medium">{s.inBase}B</span>
            <span className="text-[#C4A35A]/40 font-medium">{s.active}A</span>
            <span className={`font-medium ${s.home > 0 ? 'text-[#FED100]/70' : 'text-[#C4A35A]/40'}`}>
              {s.home}H
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
