import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { MIN_PLAYERS, MAX_PLAYERS } from 'shared';
import { roomManager } from '../game/RoomManager.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerLobbyHandlers(io: IO, socket: TypedSocket): void {
  socket.on('lobby:create', ({ playerName }) => {
    if (!playerName.trim()) {
      socket.emit('lobby:error', { message: 'Name is required.' });
      return;
    }

    const room = roomManager.createRoom();
    room.addPlayer(socket.id, playerName.trim(), true);
    socket.join(room.code);

    socket.emit('lobby:created', {
      roomCode: room.code,
      players: room.getLobbyPlayers(),
    });

    console.log(`[lobby] ${playerName} created room ${room.code}`);
  });

  socket.on('lobby:join', ({ playerName, roomCode }) => {
    if (!playerName.trim()) {
      socket.emit('lobby:error', { message: 'Name is required.' });
      return;
    }

    const code = roomCode.toUpperCase();
    const room = roomManager.getRoom(code);

    if (!room) {
      socket.emit('lobby:error', { message: 'Room not found.' });
      return;
    }
    if (room.isStarted) {
      socket.emit('lobby:error', { message: 'Game already in progress.' });
      return;
    }
    if (room.playerCount >= MAX_PLAYERS) {
      socket.emit('lobby:error', { message: 'Room is full.' });
      return;
    }
    if (room.hasName(playerName.trim())) {
      socket.emit('lobby:error', { message: 'Name already taken in this room.' });
      return;
    }

    room.addPlayer(socket.id, playerName.trim(), false);
    socket.join(code);

    socket.emit('lobby:joined', {
      roomCode: code,
      players: room.getLobbyPlayers(),
    });

    socket.to(code).emit('lobby:player-joined', {
      players: room.getLobbyPlayers(),
    });

    console.log(`[lobby] ${playerName} joined room ${code}`);
  });

  socket.on('lobby:start-game', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room) return;

    if (!room.isHost(socket.id)) {
      socket.emit('lobby:error', { message: 'Only the host can start the game.' });
      return;
    }
    if (room.playerCount < MIN_PLAYERS) {
      socket.emit('lobby:error', { message: `Need at least ${MIN_PLAYERS} players.` });
      return;
    }

    room.startGame();

    // Notify everyone the game started
    io.to(room.code).emit('game:started');

    // Send private dossier to each player
    for (const playerId of room.getPlayerIds()) {
      const dossier = room.getDossierFor(playerId);
      if (dossier) {
        io.to(playerId).emit('game:dossier-reveal', dossier);
      }
    }

    console.log(`[game] Room ${room.code} started with ${room.playerCount} players`);
  });

  socket.on('disconnect', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room) return;

    room.removePlayer(socket.id);

    if (room.isEmpty) {
      roomManager.removeRoom(room.code);
      console.log(`[lobby] Room ${room.code} removed (empty)`);
    } else {
      io.to(room.code).emit('lobby:player-left', {
        players: room.getLobbyPlayers(),
      });
    }
  });
}
