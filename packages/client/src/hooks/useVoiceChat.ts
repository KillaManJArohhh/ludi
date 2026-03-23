import { useState, useEffect, useCallback, useRef } from 'react';
import type { Player } from '@ludi/shared';
import { voiceChat } from '../services/voiceChat.js';

export function useVoiceChat(roomCode: string, playerId: string, players: Player[]) {
  const [isMuted, setIsMuted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
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
      setIsActive(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      voiceChat.setMuted(next);
      return next;
    });
  }, []);

  return { isMuted, toggleMute, isActive, participantCount };
}
