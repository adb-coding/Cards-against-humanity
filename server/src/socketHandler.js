
import { RoomManager } from './game/RoomManager.js';
import { GameEngine } from './game/GameEngine.js';
import { availableOptions } from './data/index.js';

export function registerSocketHandlers(io, socket) {
  console.log(`[connect] ${socket.id}`);

  // Send available game options to the client immediately
  socket.emit('room:options', availableOptions);

  // ── room:create ──────────────────────────────────────────────────────
  socket.on('room:create', ({ playerName, options } = {}) => {
    if (!playerName?.trim()) {
      return socket.emit('room:error', { message: 'Player name is required.' });
    }
    const room = RoomManager.createRoom(socket.id, playerName.trim(), options);
    socket.join(room.code);
    socket.emit('room:created', {
      roomCode: room.code,
      playerId: socket.id,
      playerName: playerName.trim(),
      players: room.getPlayerList(),
    });
    console.log(`[room:create] ${playerName} created room ${room.code} with options: ${JSON.stringify(options)}`);
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

  // ── room:leave ────────────────────────────────────────────────────────
  socket.on('room:leave', () => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return;
    const player = room.getPlayer(socket.id);
    const playerName = player?.name || 'Unknown';
    room.removePlayer(socket.id);
    socket.leave(room.code);
    if (room.players.size === 0) {
      RoomManager.deleteRoom(room.code);
      return;
    }
    if (room.hostId === socket.id) {
      room.hostId = room.getOrderedPlayers()[0];
      io.to(room.code).emit('room:hostChanged', { newHostId: room.hostId });
    }
    io.to(room.code).emit('room:playerLeft', {
      playerId: socket.id,
      playerName,
      players: room.getPlayerList(),
    });
    console.log(`[room:leave] ${playerName} left room ${room.code}`);
  });

  // ── room:rejoin ───────────────────────────────────────────────────────
  socket.on('room:rejoin', ({ roomCode, playerName } = {}) => {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase === 'ended') {
      return socket.emit('room:rejoinFailed');
    }
    let existingId = null;
    for (const [id, p] of room.players) {
      if (p.name === playerName) { existingId = id; break; }
    }
    if (!existingId) return socket.emit('room:rejoinFailed');

    const player = room.replacePlayerId(existingId, socket.id);
    socket.join(room.code);

    const response = {
      roomCode: room.code,
      playerId: socket.id,
      playerName: player.name,
      hostId: room.hostId,
      players: room.getPlayerList(),
      phase: room.phase,
    };

    if (room.phase !== 'lobby') {
      const czarId = room.getCzarId();
      const nonCzarIds = [...room.players.keys()].filter((id) => id !== czarId);
      response.round = room.round;
      response.czarId = czarId;
      response.blackCard = room.currentBlackCard;
      response.scores = room.getScores();
      response.hand = player.hand;
      response.maxRedraws = room.maxRedraws;
      response.myRedraws = player.redraws;
      response.hasSubmitted = room.submissions.has(socket.id);
      response.submittedCount = room.submissions.size;
      response.totalNeeded = nonCzarIds.length;
    }

    if (room.phase === 'judging' || room.phase === 'scoring') {
      response.submissions = room.submissionOrder.map((pid, index) => ({
        submissionId: index,
        cards: room.submissions.get(pid),
      }));
    }

    if (room.phase === 'scoring' && room.roundWinner) {
      const winner = room.getPlayer(room.roundWinner);
      response.roundWinner = {
        id: room.roundWinner,
        name: winner?.name,
        cards: room.submissions.get(room.roundWinner),
      };
    }

    socket.emit('room:rejoined', response);
    socket.to(room.code).emit('room:playerJoined', { players: room.getPlayerList() });
    console.log(`[room:rejoin] ${playerName} rejoined room ${roomCode}`);
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

  // ── game:redrawHand ───────────────────────────────────────────────────
  socket.on('game:redrawHand', () => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });

    const result = GameEngine.redrawHand(room, socket.id);
    if (result.error) return socket.emit('game:error', { message: result.error });

    socket.emit('game:handRedrawn', { hand: result.hand, redraws: result.redraws, maxRedraws: result.maxRedraws });
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
