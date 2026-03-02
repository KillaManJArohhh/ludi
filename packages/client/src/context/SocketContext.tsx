import { createContext, useContext, type ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket.js';

type SocketContextValue = ReturnType<typeof useSocket>;

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider');
  return ctx;
}
