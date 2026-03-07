import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.js';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await forgotPassword(email);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="font-[Playfair_Display] text-3xl font-bold text-gold mb-8 tracking-wide">
        Forgot Password
      </h2>

      {submitted ? (
        <div className="glass-panel rounded-xl p-6 w-full max-w-sm text-center">
          <p className="text-[#f0ece4] mb-4">
            If an account with that email exists, a password reset link has been sent.
          </p>
          <p className="text-[#C4A35A]/50 text-sm mb-6">
            Check your inbox and spam folder.
          </p>
          <button
            onClick={() => navigate('/account')}
            className="btn-primary py-3 px-8 rounded-xl text-white font-bold text-base tracking-wide"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
          <div>
            <label className="text-[11px] text-[#C4A35A]/50 font-medium tracking-wide uppercase">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full glass-panel rounded-lg px-4 py-3 text-[#f0ece4]
                         text-sm outline-none focus:border-[#C4A35A]/30
                         placeholder:text-[#C4A35A]/20 mt-1"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="btn-primary py-3 rounded-xl text-white font-bold text-base tracking-wide
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/account')}
            className="text-[#C4A35A]/50 text-sm font-medium hover:text-[#C4A35A] transition-colors"
          >
            Back to Login
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
