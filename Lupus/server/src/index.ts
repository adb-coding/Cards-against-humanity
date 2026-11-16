import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'lupus-shared';
import { registerSocketHandlers } from './socket.js';

// Standalone server for working on Lupus in Tabula alone.
// In production the Table Night gateway (../../server) mounts the same handlers.
const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  path: '/lupus/socket.io',
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' },
});

registerSocketHandlers(io);

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, () => {
  console.log(`[lupus] Listening on http://localhost:${PORT}`);
});
