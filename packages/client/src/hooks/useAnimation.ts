import { useState, useCallback, useRef, useEffect } from 'react';

interface AnimationState {
  pieceId: string | null;
  isAnimating: boolean;
}

export function useAnimation() {
  const [animState, setAnimState] = useState<AnimationState>({
    pieceId: null,
    isAnimating: false,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const animate = useCallback((pieceId: string, duration: number = 300) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setAnimState({ pieceId, isAnimating: true });

    timeoutRef.current = setTimeout(() => {
      setAnimState({ pieceId: null, isAnimating: false });
    }, duration);
  }, []);

  return { animState, animate };
}
