import { useState } from 'react';
import type { Player } from '@ludi/shared';
import { COLOR_HEX } from '@ludi/shared';

const API_BASE = import.meta.env.VITE_SERVER_URL || '';

interface GameOverModalProps {
  winner: Player;
  turnCount: number;
  onPlayAgain: () => void;
  onHome: () => void;
  onRematch?: () => void;
  eloChange?: number | null;
  // Online game — pass all players and the current user's auth token to enable Add Friend
  allPlayers?: Player[];
  authToken?: string | null;
  localPlayerId?: string;
}

export default function GameOverModal({
  winner, turnCount, onPlayAgain, onHome, onRematch, eloChange,
  allPlayers, authToken, localPlayerId,
}: GameOverModalProps) {
  const primaryColor = COLOR_HEX[winner.colors[0]];
  // Map of player.id → 'idle' | 'loading' | 'added' | 'requested' | string(error msg)
  const [addStatus, setAddStatus] = useState<Record<string, string>>({});

  async function handleAddFriend(player: Player) {
    setAddStatus(s => ({ ...s, [player.id]: 'loading' }));
    try {
      const res = await fetch(`${API_BASE}/api/friends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ displayName: player.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddStatus(s => ({ ...s, [player.id]: data.error || 'Failed' }));
      } else if (data.relationship === 'friends') {
        setAddStatus(s => ({ ...s, [player.id]: 'added' }));
      } else {
        // pending_outgoing
        setAddStatus(s => ({ ...s, [player.id]: 'requested' }));
      }
    } catch {
      setAddStatus(s => ({ ...s, [player.id]: 'Failed' }));
    }
  }

  const otherPlayers = allPlayers?.filter(p => p.id !== localPlayerId && !p.isAI) ?? [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="glass-panel rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl animate-fade-in"
        style={{ borderColor: `${primaryColor}40` }}
      >
        {/* Crown / trophy emblem */}
        <div className="relative mb-5">
          <svg width="72" height="72" viewBox="0 0 72 72" className="mx-auto">
            <circle cx="36" cy="36" r="34" fill="none" stroke={primaryColor} strokeWidth="1" opacity="0.3" />
            <circle cx="36" cy="36" r="28" fill={`${primaryColor}15`} />
            <path d="M20 44 L24 28 L30 36 L36 24 L42 36 L48 28 L52 44 Z" fill={primaryColor} opacity="0.9" />
            <path d="M20 44 L52 44 L50 50 L22 50 Z" fill={primaryColor} opacity="0.7" />
            <circle cx="30" cy="46" r="2" fill="#fff" opacity="0.6" />
            <circle cx="36" cy="46" r="2" fill="#fff" opacity="0.6" />
            <circle cx="42" cy="46" r="2" fill="#fff" opacity="0.6" />
          </svg>
        </div>

        <h2 className="font-[Playfair_Display] text-3xl font-bold mb-3 tracking-wide" style={{ color: primaryColor }}>
          Victory!
        </h2>

        <div className="flex items-center justify-center gap-2.5 mb-4">
          {winner.colors.map(color => (
            <div
              key={color}
              className="w-6 h-6 rounded-full border border-white/20"
              style={{ backgroundColor: COLOR_HEX[color], boxShadow: `0 0 10px ${COLOR_HEX[color]}50` }}
            />
          ))}
          <span className="text-lg font-bold text-[#f0ece4]">{winner.name}</span>
        </div>

        <p className="text-[#C4A35A]/50 text-sm mb-2 font-medium">Won in {turnCount} turns</p>

        {eloChange !== null && eloChange !== undefined && (
          <p className={`text-sm font-bold mb-4 ${eloChange > 0 ? 'text-[#009B3A]' : eloChange < 0 ? 'text-red-400' : 'text-[#C4A35A]/50'}`}>
            ELO: {eloChange > 0 ? '+' : ''}{eloChange}
          </p>
        )}

        {/* Add Friend section — only for logged-in users in online games */}
        {authToken && otherPlayers.length > 0 && (
          <div className="mb-5 border-t border-white/[0.06] pt-4">
            <p className="text-[10px] text-[#C4A35A]/40 mb-2.5 font-medium tracking-widest uppercase">
              Add to Friends
            </p>
            <div className="flex flex-col gap-2">
              {otherPlayers.map(player => {
                const status = addStatus[player.id];
                return (
                  <div key={player.id} className="flex items-center gap-2.5 glass-panel rounded-lg px-3 py-2">
                    <div className="flex gap-1">
                      {player.colors.map(c => (
                        <div key={c} className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_HEX[c] }} />
                      ))}
                    </div>
                    <span className="flex-1 text-sm text-[#f0ece4]/80 text-left">{player.name}</span>
                    {status === 'added' ? (
                      <span className="text-[#009B3A] text-xs font-semibold">Added ✓</span>
                    ) : status === 'requested' ? (
                      <span className="text-[#C4A35A]/60 text-xs font-semibold">Request sent</span>
                    ) : status === 'loading' ? (
                      <span className="text-[#C4A35A]/40 text-xs">...</span>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(player)}
                        className="text-xs px-2.5 py-1 rounded-md bg-[#C4A35A]/10 text-[#C4A35A]/70
                                   hover:bg-[#C4A35A]/20 hover:text-[#C4A35A] transition-colors font-medium"
                      >
                        {status ? `⚠ ${status}` : '+ Friend'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(eloChange === null || eloChange === undefined) && otherPlayers.length === 0 && <div className="mb-6" />}

        <div className="flex gap-3 justify-center">
          {onRematch && (
            <button onClick={onRematch} className="btn-primary px-8 py-3 rounded-lg text-white font-bold tracking-wide">
              Rematch
            </button>
          )}
          <button
            onClick={onPlayAgain}
            className={`${onRematch ? 'btn-secondary text-[#C4A35A]/70 hover:text-[#C4A35A]' : 'btn-primary text-white font-bold'} px-8 py-3 rounded-lg tracking-wide font-medium transition-colors`}
          >
            {onRematch ? 'New Game' : 'Play Again'}
          </button>
          <button onClick={onHome} className="btn-secondary px-8 py-3 rounded-lg text-[#C4A35A]/70 font-medium hover:text-[#C4A35A] transition-colors">
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
