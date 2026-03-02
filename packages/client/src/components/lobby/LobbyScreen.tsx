import { useState } from 'react';

interface LobbyScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onBack: () => void;
}

export default function LobbyScreen({ onCreateRoom, onJoinRoom, onBack }: LobbyScreenProps) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="font-[Playfair_Display] text-3xl font-bold text-gold mb-10 tracking-wide">
        Online Lobby
      </h2>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={onCreateRoom}
          className="btn-primary py-4 rounded-xl text-white font-bold text-lg tracking-wide"
        >
          Create Room
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#C4A35A]/15" />
          <span className="text-[10px] text-[#C4A35A]/30 font-medium tracking-widest uppercase">or join</span>
          <div className="flex-1 h-px bg-[#C4A35A]/15" />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={6}
            className="flex-1 glass-panel rounded-lg px-4 py-3 text-[#f0ece4] text-center
                       text-lg font-mono tracking-[0.3em] outline-none
                       focus:border-[#C4A35A]/30 placeholder:text-[#C4A35A]/20 uppercase"
          />
          <button
            onClick={() => joinCode.length === 6 && onJoinRoom(joinCode)}
            disabled={joinCode.length !== 6}
            className="px-6 py-3 rounded-lg btn-primary text-white font-bold
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join
          </button>
        </div>

        <button
          onClick={onBack}
          className="py-3 rounded-lg btn-secondary text-[#C4A35A]/60 font-medium
                     hover:text-[#C4A35A] transition-colors mt-2"
        >
          Back
        </button>
      </div>
    </div>
  );
}
