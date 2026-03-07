import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="glass-panel rounded-xl p-6 w-full max-w-sm text-center">
          <p className="text-red-400 mb-4">Invalid reset link. No token provided.</p>
          <button
            onClick={() => navigate('/account')}
            className="btn-primary py-3 px-8 rounded-xl text-white font-bold text-base tracking-wide"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    const result = await resetPassword(token, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="font-[Playfair_Display] text-3xl font-bold text-gold mb-8 tracking-wide">
        Reset Password
      </h2>

      {success ? (
        <div className="glass-panel rounded-xl p-6 w-full max-w-sm text-center">
          <p className="text-[#f0ece4] mb-4">
            Your password has been reset successfully.
          </p>
          <button
            onClick={() => navigate('/account')}
            className="btn-primary py-3 px-8 rounded-xl text-white font-bold text-base tracking-wide"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
          <div>
            <label className="text-[11px] text-[#C4A35A]/50 font-medium tracking-wide uppercase">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full glass-panel rounded-lg px-4 py-3 text-[#f0ece4]
                         text-sm outline-none focus:border-[#C4A35A]/30
                         placeholder:text-[#C4A35A]/20 mt-1"
              autoFocus
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="text-[11px] text-[#C4A35A]/50 font-medium tracking-wide uppercase">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full glass-panel rounded-lg px-4 py-3 text-[#f0ece4]
                         text-sm outline-none focus:border-[#C4A35A]/30
                         placeholder:text-[#C4A35A]/20 mt-1"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !password.trim() || !confirmPassword.trim()}
            className="btn-primary py-3 rounded-xl text-white font-bold text-base tracking-wide
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}

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
