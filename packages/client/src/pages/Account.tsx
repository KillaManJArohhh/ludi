import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.js';

export default function Account() {
  const navigate = useNavigate();
  const { user, login, register, logout, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#C4A35A]/50">Loading...</p>
      </div>
    );
  }

  // Logged in — show profile
  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="font-[Playfair_Display] text-3xl font-bold text-gold mb-8 tracking-wide">
          Account
        </h2>

        <div className="glass-panel rounded-xl p-6 w-full max-w-sm text-center">
          <p className="text-2xl font-bold text-[#f0ece4] mb-1">{user.displayName}</p>
          <p className="text-sm text-[#C4A35A]/50 mb-4">@{user.username}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass-panel rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-gold font-[Playfair_Display]">{user.eloRating}</p>
              <p className="text-[10px] text-[#C4A35A]/40 font-medium tracking-wide mt-1">ELO Rating</p>
            </div>
            <div className="glass-panel rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-[#f0ece4] font-[Playfair_Display]">
                {new Date().getFullYear()}
              </p>
              <p className="text-[10px] text-[#C4A35A]/40 font-medium tracking-wide mt-1">Member Since</p>
            </div>
          </div>

          <button
            onClick={() => { logout(); }}
            className="btn-secondary w-full py-3 rounded-lg text-red-400/70 font-medium
                       hover:text-red-400 transition-colors"
          >
            Log Out
          </button>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-6 px-8 py-3 rounded-lg btn-secondary text-[#C4A35A]/60 font-medium
                     hover:text-[#C4A35A] transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // Not logged in — login/register forms
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    let result;
    if (mode === 'login') {
      result = await login(username, password);
    } else {
      result = await register(username, password, displayName || username);
    }

    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="font-[Playfair_Display] text-3xl font-bold text-gold mb-8 tracking-wide">
        {mode === 'login' ? 'Log In' : 'Create Account'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <div>
          <label className="text-[11px] text-[#C4A35A]/50 font-medium tracking-wide uppercase">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="username"
            maxLength={20}
            className="w-full glass-panel rounded-lg px-4 py-3 text-[#f0ece4]
                       text-sm outline-none focus:border-[#C4A35A]/30
                       placeholder:text-[#C4A35A]/20 mt-1"
            autoFocus
          />
        </div>

        {mode === 'register' && (
          <div>
            <label className="text-[11px] text-[#C4A35A]/50 font-medium tracking-wide uppercase">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How others see you"
              maxLength={20}
              className="w-full glass-panel rounded-lg px-4 py-3 text-[#f0ece4]
                         text-sm outline-none focus:border-[#C4A35A]/30
                         placeholder:text-[#C4A35A]/20 mt-1"
            />
          </div>
        )}

        <div>
          <label className="text-[11px] text-[#C4A35A]/50 font-medium tracking-wide uppercase">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="password"
            className="w-full glass-panel rounded-lg px-4 py-3 text-[#f0ece4]
                       text-sm outline-none focus:border-[#C4A35A]/30
                       placeholder:text-[#C4A35A]/20 mt-1"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !username.trim() || !password.trim()}
          className="btn-primary py-3 rounded-xl text-white font-bold text-base tracking-wide
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          className="text-[#C4A35A]/50 text-sm font-medium hover:text-[#C4A35A] transition-colors"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </form>

      <button
        onClick={() => navigate('/')}
        className="mt-6 px-8 py-3 rounded-lg btn-secondary text-[#C4A35A]/60 font-medium
                   hover:text-[#C4A35A] transition-colors"
      >
        Back to Home
      </button>
    </div>
  );
}
