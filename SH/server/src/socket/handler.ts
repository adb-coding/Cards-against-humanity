import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { registerLobbyHandlers } from './lobbyHandler.js';
import { registerGameHandlers } from './gameHandler.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: IO): void {
  io.on('connection', (socket) => {
    console.log(`[socket] Connected: ${socket.id}`);
    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[socket] Disconnected: ${socket.id}`);
    });
  });
}
