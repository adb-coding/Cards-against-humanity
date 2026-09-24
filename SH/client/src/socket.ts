import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';

// In production set VITE_SERVER_URL; in dev, the Vite proxy handles /sh/socket.io
const URL: string | undefined = import.meta.env.VITE_SERVER_URL || undefined;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL, {
  path: '/sh/socket.io',
  autoConnect: false,
});
