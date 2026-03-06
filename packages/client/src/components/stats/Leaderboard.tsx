import { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '@ludi/shared';

const API_BASE = import.meta.env.VITE_SERVER_URL || '';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/leaderboard`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setEntries(data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-[#C4A35A]/40 text-sm text-center py-4">Loading leaderboard...</p>;
  }

  if (entries.length === 0) {
    return <p className="text-[#C4A35A]/40 text-sm text-center py-4">No ranked players yet</p>;
  }

  return (
    <div className="w-full max-w-sm">
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className="flex items-center justify-between glass-panel rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold w-6 text-center ${
                entry.rank === 1 ? 'text-[#FED100]' :
                entry.rank === 2 ? 'text-[#C0C0C0]' :
                entry.rank === 3 ? 'text-[#CD7F32]' :
                'text-[#C4A35A]/40'
              }`}>
                {entry.rank}
              </span>
              <div>
                <p className="text-sm text-[#f0ece4] font-medium">{entry.displayName}</p>
                <p className="text-[10px] text-[#C4A35A]/30">
                  {entry.gamesPlayed} games &middot; {entry.winRate}% win rate
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-gold font-[Playfair_Display]">
              {entry.eloRating}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
