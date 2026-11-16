import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'lupus-shared';

// In production set VITE_SERVER_URL; in dev the Vite proxy forwards /lupus/socket.io.
const URL: string | undefined = import.meta.env.VITE_SERVER_URL || undefined;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL, {
  path: '/lupus/socket.io',
  autoConnect: false,
});
