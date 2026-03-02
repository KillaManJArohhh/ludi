import { useCallback, useEffect, useRef, useState } from 'react';

type SoundName = 'dice-roll' | 'piece-move' | 'capture' | 'piece-home' | 'lock-form' | 'victory' | 'turn-start';

const SOUND_FREQUENCIES: Record<SoundName, { freq: number; duration: number; type: OscillatorType }> = {
  'dice-roll': { freq: 200, duration: 0.15, type: 'square' },
  'piece-move': { freq: 440, duration: 0.1, type: 'sine' },
  'capture': { freq: 150, duration: 0.3, type: 'sawtooth' },
  'piece-home': { freq: 880, duration: 0.4, type: 'sine' },
  'lock-form': { freq: 330, duration: 0.2, type: 'triangle' },
  'victory': { freq: 660, duration: 0.8, type: 'sine' },
  'turn-start': { freq: 520, duration: 0.08, type: 'sine' },
};

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('ludi-muted') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ludi-muted', String(muted));
    } catch {}
  }, [muted]);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((name: SoundName) => {
    if (muted) return;

    try {
      const ctx = getContext();
      const sound = SOUND_FREQUENCIES[name];
      if (!sound) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = sound.type;
      oscillator.frequency.setValueAtTime(sound.freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + sound.duration);
    } catch {
      // Audio not available
    }
  }, [muted, getContext]);

  const toggleMute = useCallback(() => {
    setMuted(m => !m);
  }, []);

  return { play, muted, toggleMute };
}
