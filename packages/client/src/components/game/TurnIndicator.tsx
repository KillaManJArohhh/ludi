import type { Player } from '@ludi/shared';
import { COLOR_HEX } from '@ludi/shared';

interface TurnIndicatorProps {
  player: Player;
  turnCount: number;
}

export default function TurnIndicator({ player, turnCount }: TurnIndicatorProps) {
  const primaryColor = COLOR_HEX[player.colors[0]];

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="flex gap-1.5">
        {player.colors.map(color => (
          <div
            key={color}
            className="w-4 h-4 rounded-full border border-white/20"
            style={{
              backgroundColor: COLOR_HEX[color],
              boxShadow: `0 0 8px ${COLOR_HEX[color]}40`,
            }}
          />
        ))}
      </div>
      <span
        className="text-sm font-bold tracking-wide"
        style={{ color: primaryColor }}
      >
        {player.name}'s Turn
      </span>
      <span className="text-xs text-[#C4A35A]/40 font-medium">
        #{turnCount + 1}
      </span>
    </div>
  );
}
