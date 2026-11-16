import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, GameView, ServerToClientEvents, SessionInfo } from 'lupus-shared';
import { registerSocketHandlers } from '../src/socket.js';
import { FAST, waitFor } from './helpers.js';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { view?: GameView; ended?: string };

test('a refresh or a dropped connection never loses the seat', async (t) => {
  const http = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(http, { path: '/lupus/socket.io' });
  registerSocketHandlers(io, { ...FAST, actTimeout: 60_000, wolvesTimeout: 60_000, infoTimeout: 60_000 });
  await new Promise<void>((resolve) => http.listen(0, resolve));
  const url = `http://localhost:${(http.address() as AddressInfo).port}`;

  const clients: Client[] = [];
  t.after(() => {
    for (const c of clients) c.disconnect();
    io.close();
    http.close();
  });

  const open = async (): Promise<Client> => {
    const socket: Client = connect(url, { path: '/lupus/socket.io', transports: ['websocket'], forceNew: true });
    socket.on('state', (view) => (socket.view = view));
    socket.on('session:ended', (data) => (socket.ended = data.reason));
    clients.push(socket);
    await waitFor(() => socket.connected, 'socket connected');
    return socket;
  };
  const request = <T>(emit: (ack: (res: T) => void) => void) => new Promise<T>((resolve) => emit(resolve));

  // Four players create and join a room.
  const host = await open();
  const created = await request<{ ok: boolean; session?: SessionInfo }>((ack) =>
    host.emit('room:create', { name: 'Anna' }, ack as never),
  );
  assert.ok(created.ok && created.session);
  const code = created.session.roomCode;

  const sessions: SessionInfo[] = [created.session];
  const sockets: Client[] = [host];
  for (const name of ['Bruno', 'Carla', 'Dario']) {
    const socket = await open();
    const joined = await request<{ ok: boolean; session?: SessionInfo }>((ack) =>
      socket.emit('room:join', { name, roomCode: code.toLowerCase() }, ack as never),
    );
    assert.ok(joined.ok && joined.session);
    sessions.push(joined.session);
    sockets.push(socket);
  }
  const dup = await request<{ ok: boolean; error?: string }>((ack) =>
    host.emit('room:join', { name: 'bruno', roomCode: code }, ack as never),
  );
  assert.equal(dup.ok, false, 'duplicate names are refused');
  await waitFor(() => host.view?.players.length === 4, 'everyone in the lobby');

  // Refresh in the lobby: the player comes back to the same seat.
  sockets[1].disconnect();
  await waitFor(() => host.view!.players[1].connected === false, 'Bruno shown offline');
  assert.equal(host.view!.players.length, 4, 'still in the room');
  sockets[1] = await open();
  const resumed = await request<{ ok: boolean }>((ack) =>
    sockets[1].emit('room:resume', { ...sessions[1], fromBackup: false }, ack as never),
  );
  assert.ok(resumed.ok);
  await waitFor(() => sockets[1].view?.youId === host.view!.players[1].id, 'Bruno is back');

  // Start the game.
  host.emit('lobby:start');
  await waitFor(() => sockets.every((s) => s.view?.phase === 'setup'), 'game started');
  const roles = sockets.map((s) => s.view!.me!.role);
  assert.equal(roles.filter((r) => r === 'lupo').length, 1);

  // A non-host cannot drive the game.
  sockets[2].emit('game:advance', { from: 'setup' });
  host.emit('game:advance', { from: 'setup' });
  await waitFor(() => host.view?.phase === 'night', 'night');

  // Refresh mid-game, during the night: same seat, same role, same pending action.
  const wolf = roles.indexOf('lupo');
  const before = sockets[wolf].view!;
  sockets[wolf].disconnect();
  const other = sockets[(wolf + 1) % 4];
  await waitFor(() => other.view!.players[wolf].connected === false, 'wolf shown offline');
  assert.equal(other.view!.phase, 'night', 'the game does not move while a player reconnects');

  sockets[wolf] = await open();
  const wrong = await request<{ ok: boolean }>((ack) =>
    sockets[wolf].emit('room:resume', { roomCode: code, token: 'nope', fromBackup: false }, ack as never),
  );
  assert.equal(wrong.ok, false, 'an unknown token is refused');
  const back = await request<{ ok: boolean }>((ack) =>
    sockets[wolf].emit('room:resume', { ...sessions[wolf], fromBackup: false }, ack as never),
  );
  assert.ok(back.ok);
  await waitFor(() => sockets[wolf].view !== undefined, 'state after resume');
  const after = sockets[wolf].view!;
  assert.equal(after.youId, before.youId);
  assert.equal(after.me!.role, 'lupo');
  assert.equal(after.phase, 'night');
  await waitFor(() => other.view!.players[wolf].connected === true, 'wolf shown online again');

  // A second tab restoring the saved session must not steal a seat that is in use...
  const tab = await open();
  const stolen = await request<{ ok: boolean; error?: string }>((ack) =>
    tab.emit('room:resume', { ...sessions[wolf], fromBackup: true }, ack as never),
  );
  assert.deepEqual(stolen, { ok: false, error: 'in-use' });
  // ...while an explicit resume (same tab reloading) takes it over and closes the old connection.
  const takeover = await request<{ ok: boolean }>((ack) =>
    tab.emit('room:resume', { ...sessions[wolf], fromBackup: false }, ack as never),
  );
  assert.ok(takeover.ok);
  await waitFor(() => sockets[wolf].ended === 'replaced', 'old tab told it was replaced');
  await waitFor(() => tab.view?.me?.role === 'lupo', 'new tab has the seat');

  // The seer plays, then the wolf plays from the new tab.
  const seer = sockets[roles.indexOf('veggente')];
  await waitFor(() => seer.view?.me?.action?.step === 'veggente', 'seer called');
  seer.emit('night:act', { step: 'veggente', targetId: seer.view!.me!.action!.targets[0] });
  await waitFor(() => seer.view?.me?.action?.needsAck === true, 'seer sees the result');
  seer.emit('night:ack', { step: 'veggente' });
  await waitFor(() => tab.view?.me?.action?.step === 'lupi', 'wolf called');
  tab.emit('night:act', { step: 'lupi', targetId: tab.view!.me!.action!.targets[0] });
  await waitFor(() => other.view?.phase === 'dawn' || other.view?.phase === 'ended', 'night resolved');
});
