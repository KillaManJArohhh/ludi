import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { PlayerStats } from '@ludi/shared';

const STATS_KEY = 'ludi-stats';

function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    totalCaptures: 0,
    totalLocksFormed: 0,
    gameHistory: [],
  };
}

export default function Stats() {
  const navigate = useNavigate();
  const [stats] = useState<PlayerStats>(loadStats);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h2 className="font-[Playfair_Display] text-2xl font-bold text-gold mb-8 tracking-wide">
        Statistics
      </h2>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
        <StatCard label="Games Played" value={stats.gamesPlayed} />
        <StatCard label="Wins" value={stats.wins} highlight />
        <StatCard label="Losses" value={stats.losses} />
        <StatCard label="Win Rate" value={`${winRate}%`} highlight />
        <StatCard label="Total Captures" value={stats.totalCaptures} />
        <StatCard label="Locks Formed" value={stats.totalLocksFormed} />
      </div>

      {stats.gameHistory.length > 0 && (
        <div className="w-full max-w-sm">
          <h3 className="text-[11px] text-[#C4A35A]/50 mb-2 font-medium tracking-wide uppercase">
            Recent Games
          </h3>
          <div className="space-y-2">
            {stats.gameHistory.slice(-10).reverse().map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between glass-panel rounded-lg p-3"
              >
                <div>
                  <p className="text-sm text-[#f0ece4] font-medium">{entry.opponent}</p>
                  <p className="text-[10px] text-[#C4A35A]/30">{entry.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#C4A35A]/40 font-medium">{entry.turns} turns</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      entry.result === 'win'
                        ? 'bg-[#009B3A]/15 text-[#009B3A]'
                        : 'bg-red-600/10 text-red-400/70'
                    }`}
                  >
                    {entry.result === 'win' ? 'W' : 'L'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="mt-8 px-8 py-3 rounded-lg btn-secondary text-[#C4A35A]/60 font-medium
                   hover:text-[#C4A35A] transition-colors"
      >
        Back to Home
      </button>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="glass-panel rounded-lg p-4 text-center">
      <p className={`text-2xl font-bold font-[Playfair_Display] ${highlight ? 'text-gold' : 'text-[#f0ece4]'}`}>
        {value}
      </p>
      <p className="text-[10px] text-[#C4A35A]/40 font-medium tracking-wide mt-1">{label}</p>
    </div>
  );
}
