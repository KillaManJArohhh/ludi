import { useState } from 'react';
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
  const [copied, setCopied] = useState(false);

  const joinUrl = `${window.location.origin}/online?join=${roomCode}`;
  const shareText = `Join my Ludi game! Room code: ${roomCode}\n${joinUrl}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  }

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

        {/* Share buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                       bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366]/80
                       text-xs font-semibold hover:bg-[#25D366]/20 hover:text-[#25D366]
                       transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                       bg-white/[0.04] border border-white/[0.08] text-[#C4A35A]/60
                       text-xs font-semibold hover:bg-white/[0.08] hover:text-[#C4A35A]
                       transition-colors"
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>
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
