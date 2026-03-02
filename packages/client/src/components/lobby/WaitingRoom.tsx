import { COLOR_HEX } from '@ludi/shared';
import type { Player } from '@ludi/shared';

interface WaitingRoomProps {
  roomCode: string;
  players: Player[];
  maxPlayers: number;
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
}

export default function WaitingRoom({
  roomCode,
  players,
  maxPlayers,
  isHost,
  onStart,
  onLeave,
}: WaitingRoomProps) {
  const canStart = players.length >= maxPlayers;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h3 className="font-[Playfair_Display] text-xl font-bold text-[#f0ece4] mb-3 tracking-wide">
        Waiting Room
      </h3>

      {/* Room code display */}
      <div className="glass-panel rounded-xl p-5 mb-6 text-center">
        <p className="text-[10px] text-[#C4A35A]/40 mb-1.5 font-medium tracking-widest uppercase">
          Room Code
        </p>
        <p className="text-3xl font-mono font-bold text-gold tracking-[0.3em]">
          {roomCode}
        </p>
        <p className="text-[10px] text-[#C4A35A]/30 mt-2">Share this code with friends</p>
      </div>

      {/* Player list */}
      <div className="w-full max-w-xs mb-8">
        <p className="text-[11px] text-[#C4A35A]/50 mb-2 font-medium tracking-wide uppercase">
          Players ({players.length}/{maxPlayers})
        </p>
        <div className="space-y-2">
          {players.map((player, i) => (
            <div
              key={player.id}
              className="flex items-center gap-3 glass-panel rounded-lg p-3"
            >
              <div className="flex gap-1">
                {player.colors.map(color => (
                  <div
                    key={color}
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: COLOR_HEX[color],
                      boxShadow: `0 0 4px ${COLOR_HEX[color]}30`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-[#f0ece4] flex-1 font-medium">{player.name}</span>
              {i === 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FED100]/10 text-[#FED100]/70 font-bold tracking-wider">
                  HOST
                </span>
              )}
            </div>
          ))}
          {Array.from({ length: maxPlayers - players.length }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04]
                         rounded-lg p-3 opacity-40"
            >
              <div className="w-4 h-4 rounded-full bg-[#C4A35A]/10" />
              <span className="text-sm text-[#C4A35A]/30 italic">Waiting for player...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onLeave}
          className="px-6 py-3 rounded-lg btn-secondary text-[#C4A35A]/60 font-medium
                     hover:text-[#C4A35A] transition-colors"
        >
          Leave
        </button>
        {isHost && (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="px-8 py-3 rounded-lg btn-primary text-white font-bold tracking-wide
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
