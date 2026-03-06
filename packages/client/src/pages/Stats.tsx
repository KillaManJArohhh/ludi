import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { PlayerStats, GameHistoryEntry } from '@ludi/shared';
import { useAuth } from '../context/AuthContext.js';
import Leaderboard from '../components/stats/Leaderboard.js';

const STATS_KEY = 'ludi-stats';
const API_BASE = import.meta.env.VITE_SERVER_URL || '';

function loadLocalStats(): PlayerStats {
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
  const { user, token } = useAuth();
  const [tab, setTab] = useState<'stats' | 'leaderboard'>('stats');
  const [stats, setStats] = useState<PlayerStats>(loadLocalStats);
  const [serverHistory, setServerHistory] = useState<GameHistoryEntry[]>([]);
  const [eloRating, setEloRating] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  // Fetch server stats if authenticated
  useEffect(() => {
    if (!user || !token) return;

    fetch(`${API_BASE}/api/stats/${user.id}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setStats({
          gamesPlayed: data.stats.gamesPlayed,
          wins: data.stats.wins,
          losses: data.stats.losses,
          totalCaptures: data.stats.totalCaptures,
          totalLocksFormed: data.stats.totalLocksFormed,
          gameHistory: data.recentGames,
        });
        setServerHistory(data.recentGames);
        setEloRating(data.stats.eloRating);
      })
      .catch(() => {
        // Fall back to local stats
      });
  }, [user, token]);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;

  const handleImportLocal = async () => {
    if (!token) return;
    const local = loadLocalStats();
    if (local.gameHistory.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/stats/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ games: local.gameHistory }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imported > 0) {
          localStorage.removeItem(STATS_KEY);
          // Refresh stats
          window.location.reload();
        }
      }
    } catch {
      // Ignore
    } finally {
      setImporting(false);
    }
  };

  const localStats = loadLocalStats();
  const hasLocalStats = localStats.gameHistory.length > 0 && user;

  const history = user ? serverHistory : stats.gameHistory;

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h2 className="font-[Playfair_Display] text-2xl font-bold text-gold mb-6 tracking-wide">
        Statistics
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setTab('stats')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'stats'
              ? 'bg-[#009B3A]/20 text-[#009B3A] border border-[#009B3A]/30'
              : 'text-[#C4A35A]/50 hover:text-[#C4A35A]'
          }`}
        >
          My Stats
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'leaderboard'
              ? 'bg-[#009B3A]/20 text-[#009B3A] border border-[#009B3A]/30'
              : 'text-[#C4A35A]/50 hover:text-[#C4A35A]'
          }`}
        >
          Leaderboard
        </button>
      </div>

      {tab === 'leaderboard' ? (
        <Leaderboard />
      ) : (
        <>
          {!user && (
            <p className="text-[#C4A35A]/40 text-xs mb-4 text-center">
              Guest stats (local only). Create an account to persist stats.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
            {eloRating !== null && (
              <>
                <div className="col-span-2 glass-panel rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold font-[Playfair_Display] text-gold">{eloRating}</p>
                  <p className="text-[10px] text-[#C4A35A]/40 font-medium tracking-wide mt-1">ELO Rating</p>
                </div>
              </>
            )}
            <StatCard label="Games Played" value={stats.gamesPlayed} />
            <StatCard label="Wins" value={stats.wins} highlight />
            <StatCard label="Losses" value={stats.losses} />
            <StatCard label="Win Rate" value={`${winRate}%`} highlight />
            <StatCard label="Total Captures" value={stats.totalCaptures} />
            <StatCard label="Locks Formed" value={stats.totalLocksFormed} />
          </div>

          {hasLocalStats && (
            <button
              onClick={handleImportLocal}
              disabled={importing}
              className="btn-secondary px-6 py-2 rounded-lg text-sm text-[#C4A35A]/70 font-medium mb-6
                         hover:text-[#C4A35A] transition-colors disabled:opacity-40"
            >
              {importing ? 'Importing...' : 'Import Local Stats'}
            </button>
          )}

          {history.length > 0 && (
            <div className="w-full max-w-sm">
              <h3 className="text-[11px] text-[#C4A35A]/50 mb-2 font-medium tracking-wide uppercase">
                Recent Games
              </h3>
              <div className="space-y-2">
                {history.slice(0, 10).map((entry, i) => (
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
                      {entry.eloChange !== undefined && entry.eloChange !== 0 && (
                        <span className={`text-[10px] font-bold ${entry.eloChange > 0 ? 'text-[#009B3A]' : 'text-red-400'}`}>
                          {entry.eloChange > 0 ? '+' : ''}{entry.eloChange}
                        </span>
                      )}
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
        </>
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
