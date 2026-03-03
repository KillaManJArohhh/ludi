import type { Color, Player } from '@ludi/shared';
import { COLOR_HEX } from '@ludi/shared';

interface TurnIndicatorProps {
  player: Player;
  turnCount: number;
  activeColor?: Color;
}

export default function TurnIndicator({ player, turnCount, activeColor }: TurnIndicatorProps) {
  const displayColor = activeColor ? COLOR_HEX[activeColor] : COLOR_HEX[player.colors[0]];

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="flex gap-1.5">
        {player.colors.map(color => {
          const isActive = activeColor ? color === activeColor : true;
          return (
            <div
              key={color}
              className="w-4 h-4 rounded-full border border-white/20 transition-opacity duration-200"
              style={{
                backgroundColor: COLOR_HEX[color],
                boxShadow: isActive ? `0 0 8px ${COLOR_HEX[color]}40` : 'none',
                opacity: isActive ? 1 : 0.3,
              }}
            />
          );
        })}
      </div>
      <span
        className="text-sm font-bold tracking-wide"
        style={{ color: displayColor }}
      >
        {player.name}'s Turn
      </span>
      <span className="text-xs text-[#C4A35A]/40 font-medium">
        #{turnCount + 1}
      </span>
    </div>
  );
}
