import { RoomManager } from './game/RoomManager.js';
import { GameEngine } from './game/GameEngine.js';
import { availableOptions } from './data/index.js';

const ROUND_PHASES = ['playing', 'reading', 'judging'];

export function registerSocketHandlers(io, socket) {
  console.log(`[connect] ${socket.id}`);

  // Send available game options to the client immediately
  socket.emit('room:options', availableOptions);

  const sendHand = (room, playerId) => {
    const player = room.getPlayer(playerId);
    if (!player) return;
    io.to(playerId).emit('game:dealtHand', { hand: player.hand, redrawsLeft: room.redrawsLeft(playerId) });
  };

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
      settings: room.settings,
    });
    console.log(`[room:create] ${playerName} created room ${room.code} with settings: ${JSON.stringify(room.settings)}`);
  });

  // ── room:join ─────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomCode, playerName } = {}) => {
    if (!playerName?.trim()) {
      return socket.emit('room:error', { message: 'Player name is required.' });
    }
    const room = RoomManager.getRoom(roomCode || '');
    if (!room) {
      return socket.emit('room:error', { message: 'Room not found.' });
    }
    if (room.phase !== 'lobby') {
      return socket.emit('room:error', { message: 'Game already in progress.' });
    }
    if (room.players.size >= 10) {
      return socket.emit('room:error', { message: 'Room is full.' });
    }
    if (room.hasName(playerName.trim())) {
      return socket.emit('room:error', { message: 'That name is already taken in this room.' });
    }

    room.addPlayer(socket.id, playerName.trim());
    socket.join(room.code);

    socket.emit('room:joined', {
      roomCode: room.code,
      playerId: socket.id,
      playerName: playerName.trim(),
      players: room.getPlayerList(),
      hostId: room.hostId,
      settings: room.settings,
    });

    socket.to(room.code).emit('room:playerJoined', {
      player: { id: socket.id, name: playerName.trim() },
      players: room.getPlayerList(),
    });

    console.log(`[room:join] ${playerName} joined room ${room.code}`);
  });

  // ── room:updateSettings ───────────────────────────────────────────────
  socket.on('room:updateSettings', (settings = {}) => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('room:error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('room:error', { message: 'Only the host can change the settings.' });
    if (room.phase !== 'lobby') return socket.emit('room:error', { message: 'Settings can only change in the lobby.' });

    room.applySettings(settings);
    io.to(room.code).emit('room:settings', { settings: room.settings });
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
    for (const playerId of room.players.keys()) sendHand(room, playerId);

    console.log(`[game:start] Room ${room.code} started`);
  });

  // ── game:redrawHand ───────────────────────────────────────────────────
  socket.on('game:redrawHand', () => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });

    const result = GameEngine.redrawHand(room, socket.id);
    if (result.error) return socket.emit('game:error', { message: result.error });

    socket.emit('game:dealtHand', { hand: result.hand, redrawsLeft: result.redrawsLeft, redrawn: true });
  });

  // ── game:submitCards ──────────────────────────────────────────────────
  socket.on('game:submitCards', ({ cardIds } = {}) => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });

    const result = GameEngine.submitCards(room, socket.id, cardIds || []);
    if (result.error) return socket.emit('game:error', { message: result.error });

    sendHand(room, socket.id);

    // Tell everyone who is done (without revealing cards)
    io.to(room.code).emit('game:playerSubmitted', {
      playerId: socket.id,
      submittedIds: result.submittedIds,
      submittedCount: result.submittedCount,
      totalNeeded: result.totalNeeded,
    });

    if (result.allSubmitted) {
      const reading = GameEngine.buildReadingState(room);
      io.to(room.code).emit('game:allSubmitted', { phase: reading.phase, count: reading.submissions.length });
      // Only the Czar sees the answers while reading them
      io.to(room.getCzarId()).emit('game:submissionsRevealed', { submissions: reading.submissions });
    }
  });

  // ── game:czarReveal ───────────────────────────────────────────────────
  socket.on('game:czarReveal', ({ submissionId } = {}) => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });

    const result = GameEngine.revealSubmission(room, socket.id, submissionId);
    if (result.error) return socket.emit('game:error', { message: result.error });

    io.to(room.code).emit('game:readingProgress', { revealed: result.revealed });
  });

  // ── game:czarContinue ─────────────────────────────────────────────────
  socket.on('game:czarContinue', () => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });

    const result = GameEngine.startJudging(room, socket.id);
    if (result.error) return socket.emit('game:error', { message: result.error });

    io.to(room.code).emit('game:judgingStarted', result);
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
    for (const playerId of room.players.keys()) sendHand(room, playerId);
  });

  // ── game:playAgain ────────────────────────────────────────────────────
  socket.on('game:playAgain', () => {
    const room = RoomManager.findRoomByPlayer(socket.id);
    if (!room) return socket.emit('game:error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('game:error', { message: 'Only the host can restart.' });
    if (room.phase !== 'ended') return socket.emit('game:error', { message: 'The game is not over yet.' });

    room.resetToLobby();
    io.to(room.code).emit('room:backToLobby', {
      players: room.getPlayerList(),
      hostId: room.hostId,
      settings: room.settings,
    });
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

    // A round in progress can't finish cleanly without this player: skip it.
    if (ROUND_PHASES.includes(room.phase)) {
      // Ensure czarIndex is still valid
      if (room.czarIndex >= room.players.size) {
        room.czarIndex = 0;
      }
      // Return this round's played cards to their owners' hands
      for (const [pid, cards] of room.submissions) {
        const owner = room.getPlayer(pid);
        if (owner) owner.hand.push(...cards);
      }
      room.submissions.clear();
      room.submissionOrder = [];
      room.revealed.clear();
      room.phase = 'scoring';
      room.roundWinner = null;
      io.to(room.code).emit('game:roundSkipped', {
        reason: `${playerName} left the game.`,
        phase: 'scoring',
        scores: room.getScores(),
      });
    }

    console.log(`[disconnect] ${playerName} left room ${room.code}`);
  });
}
