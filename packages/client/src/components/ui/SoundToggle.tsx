import { useState } from 'react';
import { audioManager } from '../../services/audioManager.js';

export default function SoundToggle() {
  const [muted, setMuted] = useState(() => audioManager.isMuted());

  const toggle = () => {
    const nowMuted = audioManager.toggleMute();
    setMuted(nowMuted);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-white/[0.08] border border-[#C4A35A]/20
                 hover:bg-white/[0.15] transition-colors"
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 010 14.14" />
          <path d="M15.54 8.46a5 5 0 010 7.07" />
        </svg>
      )}
    </button>
  );
}
