import { RoomManager } from './game/RoomManager.js';
import { GameEngine } from './game/GameEngine.js';

export function registerSocketHandlers(io, socket) {
  console.log(`[connect] ${socket.id}`);

  // ── room:create ──────────────────────────────────────────────────────
  socket.on('room:create', ({ playerName } = {}) => {
    if (!playerName?.trim()) {
      return socket.emit('room:error', { message: 'Player name is required.' });
    }
    const room = RoomManager.createRoom(socket.id, playerName.trim());
    socket.join(room.code);
    socket.emit('room:created', {
      roomCode: room.code,
      playerId: socket.id,
      playerName: playerName.trim(),
      players: room.getPlayerList(),
    });
    console.log(`[room:create] ${playerName} created room ${room.code}`);
  });

  // ── room:join ─────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomCode, playerName } = {}) => {
    if (!playerName?.trim()) {
      return socket.emit('room:error', { message: 'Player name is required.' });
    }
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      return socket.emit('room:error', { message: 'Room not found.' });
    }
    if (room.phase !== 'lobby') {
      return socket.emit('room:error', { message: 'Game already in progress.' });
    }
    if (room.players.size >= 10) {
      return socket.emit('room:error', { message: 'Room is full.' });
    }

    room.addPlayer(socket.id, playerName.trim());
    socket.join(room.code);

    socket.emit('room:joined', {
      roomCode: room.code,
      playerId: socket.id,
      playerName: playerName.trim(),
      players: room.getPlayerList(),
      hostId: room.hostId,
    });

    socket.to(room.code).emit('room:playerJoined', {
      player: { id: socket.id, name: playerName.trim() },
      players: room.getPlayerList(),
    });

    console.log(`[room:join] ${playerName} joined room ${room.code}`);
  });

  // ── game:start ────────────────────────────────────────────────────────
  socket.on('game:start', () => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('game:error', { message: 'Only the host can start the game.' });

    const result = GameEngine.startGame(room);
    if (result.error) return socket.emit('game:error', { message: result.error });

    io.to(room.code).emit('game:started', result);

    // Deal private hands
    for (const [playerId, player] of room.players) {
      io.to(playerId).emit('game:dealtHand', { hand: player.hand });
    }

    console.log(`[game:start] Room ${room.code} started`);
  });

  // ── game:submitCards ──────────────────────────────────────────────────
  socket.on('game:submitCards', ({ cardIds } = {}) => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });

    const result = GameEngine.submitCards(room, socket.id, cardIds || []);
    if (result.error) return socket.emit('game:error', { message: result.error });

    // Notify all players about submission count (without revealing cards)
    io.to(room.code).emit('game:playerSubmitted', {
      playerId: socket.id,
      submittedCount: result.submittedCount,
      totalNeeded: result.totalNeeded,
    });

    if (result.allSubmitted) {
      const judgingState = GameEngine.buildJudgingState(room);
      io.to(room.code).emit('game:allSubmitted', { phase: judgingState.phase });
      io.to(room.code).emit('game:submissionsRevealed', { submissions: judgingState.submissions });
    }
  });

  // ── game:judgeWinner ──────────────────────────────────────────────────
  socket.on('game:judgeWinner', ({ submissionId } = {}) => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });

    const result = GameEngine.judgeWinner(room, socket.id, submissionId);
    if (result.error) return socket.emit('game:error', { message: result.error });

    io.to(room.code).emit('game:roundWon', result);

    if (result.gameOver) {
      room.phase = 'ended';
      io.to(room.code).emit('game:ended', {
        scores: result.scores,
        winner: { id: result.winnerId, name: result.winnerName },
      });
    }
  });

  // ── game:nextRound ────────────────────────────────────────────────────
  socket.on('game:nextRound', () => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('game:error', { message: 'Only the host can advance rounds.' });

    const result = GameEngine.nextRound(room);
    if (result.error) return socket.emit('game:error', { message: result.error });

    io.to(room.code).emit('game:nextRound', result);

    // Replenish private hands
    for (const [playerId, player] of room.players) {
      io.to(playerId).emit('game:dealtHand', { hand: player.hand });
    }
  });

  // ── disconnect ────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    const playerName = player?.name || 'Unknown';

    room.removePlayer(socket.id);

    if (room.players.size === 0) {
      RoomManager.deleteRoom(room.code);
      console.log(`[disconnect] Room ${room.code} deleted (empty)`);
      return;
    }

    // Transfer host if needed
    if (room.hostId === socket.id) {
      room.hostId = room.getOrderedPlayers()[0];
      io.to(room.code).emit('room:hostChanged', { newHostId: room.hostId });
    }

    io.to(room.code).emit('room:playerLeft', {
      playerId: socket.id,
      playerName,
      players: room.getPlayerList(),
    });

    // If czar left during playing/judging, advance round
    if (room.phase === 'playing' || room.phase === 'judging') {
      // Ensure czarIndex is still valid
      if (room.czarIndex >= room.players.size) {
        room.czarIndex = 0;
      }
      // If we now have enough players, move to scoring so host can advance
      if (room.players.size >= 2) {
        room.phase = 'scoring';
        room.roundWinner = null;
        io.to(room.code).emit('game:roundSkipped', {
          reason: 'A player disconnected.',
          phase: 'scoring',
          scores: room.getScores(),
        });
      }
    }

    console.log(`[disconnect] ${playerName} left room ${room.code}`);
  });
}
