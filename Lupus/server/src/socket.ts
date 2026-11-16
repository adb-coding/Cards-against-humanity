import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'lupus-shared';
import { DEFAULT_TIMING, Room, type Player, type Timing } from './Room.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O, to avoid confusion
const SWEEP_INTERVAL = 30_000;

/**
 * Lupus in Tabula backend. Unlike a socket id, a seat survives refreshes and dropped
 * connections: each browser keeps a secret token and uses it to get its seat back.
 */
export function registerSocketHandlers(io: IO, timing: Timing = DEFAULT_TIMING): void {
  const rooms = new Map<string, Room>();

  function broadcast(room: Room): void {
    for (const player of room.players) {
      if (player.socketId) io.to(player.socketId).emit('state', room.viewFor(player));
    }
  }

  function createRoom(): Room {
    let code: string;
    do {
      code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    } while (rooms.has(code));
    const room: Room = new Room(code, timing, {
      onChange: () => broadcast(room),
      onNotice: (message) => io.to(`lupus:${code}`).emit('notice', { message }),
      onRemoved: (socketId, message) => {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) return;
        socket.emit('session:ended', { reason: 'removed', message });
        release(socket);
      },
    });
    rooms.set(code, room);
    return room;
  }

  function release(socket: GameSocket): void {
    if (socket.data.roomCode) socket.leave(`lupus:${socket.data.roomCode}`);
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
  }

  /** Gives `socket` the seat of `player`, kicking out whichever socket held it before. */
  function seat(socket: GameSocket, room: Room, player: Player): void {
    if (socket.data.roomCode && socket.data.roomCode !== room.code) {
      rooms.get(socket.data.roomCode)?.detach(socket.id);
      release(socket);
    }
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    socket.join(`lupus:${room.code}`);
    const previous = room.attach(player, socket.id);
    if (previous) {
      const old = io.sockets.sockets.get(previous);
      if (old) {
        old.emit('session:ended', {
          reason: 'replaced',
          message: 'La partita è stata aperta in un’altra scheda o su un altro dispositivo.',
        });
        release(old);
      }
    }
  }

  function dropIfEmpty(room: Room): void {
    if (room.isEmpty) {
      room.dispose();
      rooms.delete(room.code);
    }
  }

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.sweep(now)) {
        io.to(`lupus:${room.code}`).emit('session:ended', { reason: 'closed', message: 'La stanza è stata chiusa.' });
        room.dispose();
        rooms.delete(room.code);
      }
    }
  }, SWEEP_INTERVAL);
  sweeper.unref();

  io.on('connection', (socket: GameSocket) => {
    /** Runs `fn` for the room and player this socket is seated at; reports rule violations to the player. */
    const withSeat = (fn: (room: Room, playerId: string) => string | null | void) => {
      const room = socket.data.roomCode ? rooms.get(socket.data.roomCode) : undefined;
      const playerId: string | undefined = socket.data.playerId;
      if (!room || !playerId) return;
      const error = fn(room, playerId);
      if (error) socket.emit('notice', { message: error });
    };

    socket.on('room:create', (data, ack) => {
      if (typeof ack !== 'function') return;
      const room = createRoom();
      const result = room.join(String(data?.name ?? ''));
      if ('error' in result) {
        rooms.delete(room.code);
        return ack({ ok: false, error: result.error });
      }
      seat(socket, room, result.player);
      ack({ ok: true, session: { roomCode: room.code, token: result.player.token } });
    });

    socket.on('room:join', (data, ack) => {
      if (typeof ack !== 'function') return;
      const room = rooms.get(String(data?.roomCode ?? '').trim().toUpperCase());
      if (!room) return ack({ ok: false, error: 'Stanza non trovata.' });
      const result = room.join(String(data?.name ?? ''));
      if ('error' in result) return ack({ ok: false, error: result.error });
      seat(socket, room, result.player);
      ack({ ok: true, session: { roomCode: room.code, token: result.player.token } });
    });

    socket.on('room:resume', (data, ack) => {
      if (typeof ack !== 'function') return;
      const room = rooms.get(String(data?.roomCode ?? '').toUpperCase());
      const player = room?.findByToken(String(data?.token ?? ''));
      if (!room || !player) return ack({ ok: false, error: 'gone' });
      if (data.fromBackup && player.socketId && player.socketId !== socket.id) {
        return ack({ ok: false, error: 'in-use' });
      }
      seat(socket, room, player);
      ack({ ok: true });
    });

    socket.on('room:leave', () =>
      withSeat((room, playerId) => {
        room.leave(playerId);
        dropIfEmpty(room);
      }),
    );

    socket.on('host:claim', () => withSeat((room, id) => room.claimHost(id)));
    socket.on('host:kick', (data) =>
      withSeat((room, id) => {
        const error = room.kick(id, String(data?.playerId ?? ''));
        dropIfEmpty(room);
        return error;
      }),
    );
    socket.on('lobby:settings', (data) => withSeat((room, id) => room.updateSettings(id, data ?? {})));
    socket.on('lobby:start', () => withSeat((room, id) => room.start(id)));
    socket.on('game:seen-card', () => withSeat((room, id) => room.seenCard(id)));
    socket.on('game:advance', (data) => withSeat((room, id) => room.advance(id, data?.from)));
    socket.on('game:abort', () => withSeat((room, id) => room.abort(id)));
    socket.on('night:act', (data) =>
      withSeat((room, id) => room.nightAct(id, data?.step, typeof data?.targetId === 'string' ? data.targetId : null)),
    );
    socket.on('night:ack', (data) => withSeat((room, id) => room.nightAck(id, data?.step)));
    socket.on('narrator:act', (data) =>
      withSeat((room, id) => room.narratorAct(id, data?.step, typeof data?.targetId === 'string' ? data.targetId : null)),
    );
    socket.on('narrator:next', (data) => withSeat((room, id) => room.narratorNext(id, data?.step)));
    socket.on('vote:cast', (data) =>
      withSeat((room, id) => room.castVote(id, typeof data?.targetId === 'string' ? data.targetId : null)),
    );

    socket.on('disconnect', () => {
      // The seat is kept: the player comes back with `room:resume`.
      if (socket.data.roomCode) rooms.get(socket.data.roomCode)?.detach(socket.id);
    });
  });
}
