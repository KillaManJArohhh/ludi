import { io, type Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
const AUTH_TOKEN_KEY = 'ludi-auth-token';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      auth: token ? { token } : undefined,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Force reconnect with fresh auth token */
export function reconnectWithAuth(): void {
  disconnectSocket();
  // getSocket will pick up the new token from localStorage
}
