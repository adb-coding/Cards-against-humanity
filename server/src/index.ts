/**
 * Table Night gateway: one HTTP server hosting every game's Socket.IO backend.
 * Each game gets its own Socket.IO instance on a dedicated path, so rooms,
 * events and state never mix:
 *   /cah/socket.io  -> Cards Against Humanity
 *   /sh/socket.io   -> Secret Hitler
 */
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { registerSocketHandlers as registerCah } from 'cah-server/socket';
import { registerSocketHandlers as registerSh } from 'sh-server/socket';

const PORT = Number(process.env.PORT) || 3001;
// Comma-separated list of allowed origins, e.g. "https://table-night.netlify.app"
const CORS_ORIGIN = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? '*';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.get('/health', (_req, res) => res.json({ status: 'ok', games: ['cah', 'sh'] }));

const httpServer = createServer(app);

// Both instances share the HTTP server's upgrade event; don't let one
// destroy WebSocket upgrades that belong to the other.
const common = { cors: { origin: CORS_ORIGIN }, destroyUpgrade: false } as const;

const cahIo = new Server(httpServer, { ...common, path: '/cah/socket.io' });
cahIo.on('connection', (socket) => registerCah(cahIo, socket));

const shIo = new Server(httpServer, { ...common, path: '/sh/socket.io' });
registerSh(shIo as Parameters<typeof registerSh>[0]);

httpServer.listen(PORT, () => {
  console.log(`[table-night] Listening on http://localhost:${PORT}`);
});
