import type { Player } from '@ludi/shared';
import { COLOR_HEX } from '@ludi/shared';

interface GameOverModalProps {
  winner: Player;
  turnCount: number;
  onPlayAgain: () => void;
  onHome: () => void;
  onRematch?: () => void;
  eloChange?: number | null;
}

export default function GameOverModal({ winner, turnCount, onPlayAgain, onHome, onRematch, eloChange }: GameOverModalProps) {
  const primaryColor = COLOR_HEX[winner.colors[0]];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="glass-panel rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl animate-fade-in"
        style={{ borderColor: `${primaryColor}40` }}
      >
        {/* Crown / trophy emblem */}
        <div className="relative mb-5">
          <svg width="72" height="72" viewBox="0 0 72 72" className="mx-auto">
            {/* Outer glow */}
            <circle cx="36" cy="36" r="34" fill="none" stroke={primaryColor} strokeWidth="1" opacity="0.3" />
            <circle cx="36" cy="36" r="28" fill={`${primaryColor}15`} />
            {/* Crown shape */}
            <path
              d="M20 44 L24 28 L30 36 L36 24 L42 36 L48 28 L52 44 Z"
              fill={primaryColor}
              opacity="0.9"
            />
            <path
              d="M20 44 L52 44 L50 50 L22 50 Z"
              fill={primaryColor}
              opacity="0.7"
            />
            {/* Jewels */}
            <circle cx="30" cy="46" r="2" fill="#fff" opacity="0.6" />
            <circle cx="36" cy="46" r="2" fill="#fff" opacity="0.6" />
            <circle cx="42" cy="46" r="2" fill="#fff" opacity="0.6" />
          </svg>
        </div>

        <h2
          className="font-[Playfair_Display] text-3xl font-bold mb-3 tracking-wide"
          style={{ color: primaryColor }}
        >
          Victory!
        </h2>

        <div className="flex items-center justify-center gap-2.5 mb-4">
          {winner.colors.map(color => (
            <div
              key={color}
              className="w-6 h-6 rounded-full border border-white/20"
              style={{
                backgroundColor: COLOR_HEX[color],
                boxShadow: `0 0 10px ${COLOR_HEX[color]}50`,
              }}
            />
          ))}
          <span className="text-lg font-bold text-[#f0ece4]">
            {winner.name}
          </span>
        </div>

        <p className="text-[#C4A35A]/50 text-sm mb-2 font-medium">
          Won in {turnCount} turns
        </p>

        {eloChange !== null && eloChange !== undefined && (
          <p className={`text-sm font-bold mb-6 ${eloChange > 0 ? 'text-[#009B3A]' : eloChange < 0 ? 'text-red-400' : 'text-[#C4A35A]/50'}`}>
            ELO: {eloChange > 0 ? '+' : ''}{eloChange}
          </p>
        )}

        {(eloChange === null || eloChange === undefined) && <div className="mb-6" />}

        <div className="flex gap-3 justify-center">
          {onRematch && (
            <button
              onClick={onRematch}
              className="btn-primary px-8 py-3 rounded-lg text-white font-bold tracking-wide"
            >
              Rematch
            </button>
          )}
          <button
            onClick={onPlayAgain}
            className={`${onRematch ? 'btn-secondary text-[#C4A35A]/70 hover:text-[#C4A35A]' : 'btn-primary text-white font-bold'} px-8 py-3 rounded-lg tracking-wide font-medium transition-colors`}
          >
            {onRematch ? 'New Game' : 'Play Again'}
          </button>
          <button
            onClick={onHome}
            className="btn-secondary px-8 py-3 rounded-lg text-[#C4A35A]/70 font-medium
                       hover:text-[#C4A35A] transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
