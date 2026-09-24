import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { registerSocketHandlers } from './socket/handler.js';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  // Same path the Table Night gateway (../../server) uses, so the client works with both.
  path: '/sh/socket.io',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  },
});

registerSocketHandlers(io);

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
