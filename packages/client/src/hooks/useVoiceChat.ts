import { useState, useEffect, useCallback, useRef } from 'react';
import type { Player } from '@ludi/shared';
import { voiceChat } from '../services/voiceChat.js';

export function useVoiceChat(roomCode: string, playerId: string, players: Player[]) { // players retained for API compatibility — connections are established reactively via socket events
  const [isMuted, setIsMuted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Reset ref on each effect invocation (handles React StrictMode double-mount)
    mountedRef.current = true;

    voiceChat.onParticipantCountChange((count) => {
      if (mountedRef.current) setParticipantCount(count);
    });

    voiceChat.connect(playerId, roomCode).then(() => {
      if (mountedRef.current) setIsActive(voiceChat.isActive());
    });

    return () => {
      mountedRef.current = false;
      voiceChat.disconnect();
      // No setIsActive here — component is unmounting, state updates are pointless
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    voiceChat.setMuted(!voiceChat.isMuted());
  }, []);

  return { isMuted, toggleMute, isActive, participantCount };
}
