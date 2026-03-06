import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.js';
import SoundToggle from '../components/ui/SoundToggle.js';
import InstallPrompt from '../components/ui/InstallPrompt.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Sound toggle */}
      <div className="absolute top-4 right-4 z-30">
        <SoundToggle />
      </div>

      {/* Account button */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={() => navigate('/account')}
          className="text-[#C4A35A]/50 text-sm font-medium hover:text-[#C4A35A] transition-colors
                     glass-panel rounded-lg px-3 py-1.5"
        >
          {user ? user.displayName : 'Account'}
        </button>
      </div>

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#FED100]/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#009B3A]/[0.04] blur-[100px] pointer-events-none" />

      {/* Title area */}
      <div className="text-center mb-14 relative">
        {/* Jamaican flag accent */}
        <div className="flex justify-center items-center gap-0 mb-6">
          <div className="h-[3px] w-12 bg-[#009B3A] rounded-l-full" />
          <div className="h-[3px] w-8 bg-[#FED100]" />
          <div className="h-[3px] w-12 bg-[#1a1a1a] rounded-r-full border border-white/10" />
        </div>

        <h1
          className="text-6xl md:text-7xl font-black tracking-tight mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <span className="text-gold">Ludi</span>
        </h1>

        <p className="text-[#C4A35A]/70 text-sm tracking-[0.2em] uppercase font-medium">
          The Jamaican Board Game
        </p>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#C4A35A]/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FED100]/40" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#C4A35A]/30" />
        </div>
      </div>

      {/* Menu buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/local')}
          className="btn-primary py-4 rounded-xl text-white font-bold text-base tracking-wide"
        >
          Local Game
        </button>

        <button
          onClick={() => navigate('/online')}
          disabled={!isOnline}
          className="btn-secondary py-4 rounded-xl text-[#C4A35A] font-semibold text-base tracking-wide
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Play Online
        </button>

        <button
          onClick={() => navigate('/spectate')}
          disabled={!isOnline}
          className="btn-secondary py-4 rounded-xl text-[#C4A35A] font-semibold text-base tracking-wide
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Watch Games
        </button>

        <button
          onClick={() => navigate('/rules')}
          className="btn-secondary py-4 rounded-xl text-[#C4A35A] font-semibold text-base tracking-wide"
        >
          How to Play
        </button>

        <button
          onClick={() => navigate('/stats')}
          className="py-3 rounded-xl text-[#C4A35A]/50 font-medium text-sm tracking-wide
                     hover:text-[#C4A35A]/80 transition-colors"
        >
          Statistics
        </button>
      </div>

      <InstallPrompt />

      {/* Footer */}
      <p className="text-[#5C3D0E]/60 text-xs mt-16 tracking-widest uppercase font-medium">
        Wa Gwaan!
      </p>
    </div>
  );
}
