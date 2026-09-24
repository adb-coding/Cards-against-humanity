import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { roomManager } from '../game/RoomManager.js';
import type { GameEngine } from '../game/GameEngine.js';
import type { GameRoom } from '../game/GameRoom.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function getRoomAndEngine(
  socketId: string
): { room: GameRoom; engine: GameEngine } | null {
  const room = roomManager.findRoomByPlayer(socketId);
  if (!room) return null;
  const engine = room.getEngine();
  if (!engine) return null;
  return { room, engine };
}

export function registerGameHandlers(io: IO, socket: TypedSocket): void {
  socket.on('game:dossier-ready', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room) return;

    const allReady = room.markDossierReady(socket.id);
    if (allReady) {
      room.initEngine();
      const engine = room.getEngine()!;
      io.to(room.code).emit('game:state-update', engine.getPublicState());
      console.log(`[game] Room ${room.code} all players ready, game board started`);
    }
  });

  socket.on('game:nominate-chancellor', ({ targetId }) => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    if (!engine.nominateChancellor(socket.id, targetId)) return;

    io.to(room.code).emit('game:state-update', engine.getPublicState());
    console.log(`[game] Room ${room.code}: president nominated ${engine.getPlayerName(targetId)}`);
  });

  socket.on('game:cast-vote', ({ vote }) => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    const { accepted, allVoted } = engine.castVote(socket.id, vote);
    if (!accepted) return;
    if (!allVoted) {
      // Let everyone see who is still deciding (the vote itself stays hidden).
      io.to(room.code).emit('game:state-update', engine.getPublicState());
      return;
    }

    const result = engine.resolveElection();
    io.to(room.code).emit('game:election-result', result);

    if (result.hitlerChancellor) {
      // Hitler elected chancellor — game over
      io.to(room.code).emit('game:state-update', engine.getPublicState());
      io.to(room.code).emit('game:over', engine.getGameOverPayload()!);
      return;
    }

    if (result.passed) {
      // Election passed — president draws policies
      const policies = engine.presidentDrawPolicies();
      io.to(room.code).emit('game:state-update', engine.getPublicState());
      io.to(engine.getPresidentId()).emit('game:president-draw', {
        drawnPolicies: policies as [any, any, any],
      });
    } else {
      // Election failed — check chaos
      const chaos = engine.checkChaos();
      if (chaos.chaos) {
        io.to(room.code).emit('game:chaos', {
          enactedPolicy: chaos.policy!,
          slot: chaos.slot!,
        });

        if (engine.isGameOver()) {
          io.to(room.code).emit('game:state-update', engine.getPublicState());
          io.to(room.code).emit('game:over', engine.getGameOverPayload()!);
          return;
        }
      }

      // Advance to next round
      engine.advanceToNextRound();
      io.to(room.code).emit('game:state-update', engine.getPublicState());
    }
  });

  socket.on('game:president-discard', ({ discardIndex }) => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    if (socket.id !== engine.getPresidentId()) return;

    const remaining = engine.presidentDiscard(discardIndex);
    if (!remaining) return;

    io.to(room.code).emit('game:state-update', engine.getPublicState());
    io.to(engine.getChancellorId()!).emit('game:chancellor-receive', {
      receivedPolicies: remaining as [any, any],
      canVeto: engine.vetoUnlocked,
    });
  });

  socket.on('game:chancellor-enact', ({ enactIndex }) => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    if (socket.id !== engine.getChancellorId()) return;

    const result = engine.chancellorEnact(enactIndex);
    if (!result) return;

    io.to(room.code).emit('game:policy-enacted', {
      policy: result.enacted,
      slot: result.slot,
    });

    if (engine.isGameOver()) {
      io.to(room.code).emit('game:state-update', engine.getPublicState());
      io.to(room.code).emit('game:over', engine.getGameOverPayload()!);
      return;
    }

    if (result.executiveAction !== 'none') {
      io.to(room.code).emit('game:state-update', engine.getPublicState());
      io.to(room.code).emit('game:executive-action-notification', {
        action: result.executiveAction,
        presidentName: engine.getPlayerName(engine.getPresidentId()),
      });

      // If policy-peek, send the peek privately
      if (result.executiveAction === 'policy-peek') {
        const topPolicies = engine.getPolicyPeek();
        io.to(engine.getPresidentId()).emit('game:policy-peek', {
          topPolicies: topPolicies as [any, any, any],
        });
      }
    } else {
      // No executive action, advance to next round
      engine.advanceToNextRound();
      io.to(room.code).emit('game:state-update', engine.getPublicState());
    }
  });

  socket.on('game:request-veto', () => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    if (socket.id !== engine.getChancellorId()) return;
    if (!engine.chancellorRequestVeto()) return;

    io.to(room.code).emit('game:state-update', engine.getPublicState());
    io.to(engine.getPresidentId()).emit('game:veto-request');
  });

  socket.on('game:veto-response', ({ response }) => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    if (socket.id !== engine.getPresidentId()) return;

    const result = engine.presidentRespondToVeto(response);

    if (!result.accepted) {
      // Rejected — chancellor must enact
      io.to(room.code).emit('game:state-update', engine.getPublicState());
      // Re-send chancellor's policies
      io.to(engine.getChancellorId()!).emit('game:chancellor-receive', {
        receivedPolicies: engine.getChancellorPolicies() as [any, any],
        canVeto: false, // Can't veto again after rejection
      });
      return;
    }

    // Veto accepted
    if (result.chaos) {
      io.to(room.code).emit('game:chaos', {
        enactedPolicy: result.chaosPolicy!,
        slot: result.chaosSlot!,
      });

      if (engine.isGameOver()) {
        io.to(room.code).emit('game:state-update', engine.getPublicState());
        io.to(room.code).emit('game:over', engine.getGameOverPayload()!);
        return;
      }
    }

    engine.advanceToNextRound();
    io.to(room.code).emit('game:state-update', engine.getPublicState());
  });

  socket.on('game:investigate-player', ({ targetId }) => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    const result = engine.investigatePlayer(socket.id, targetId);
    if (!result) return;

    io.to(socket.id).emit('game:investigation-result', {
      targetId,
      targetName: result.targetName,
      team: result.team,
    });

    io.to(room.code).emit('game:executive-action-notification', {
      action: 'investigate-loyalty',
      presidentName: engine.getPlayerName(engine.getPresidentId()),
      targetName: result.targetName,
    });

    engine.advanceToNextRound();
    io.to(room.code).emit('game:state-update', engine.getPublicState());
  });

  socket.on('game:special-election', ({ targetId }) => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    const targetName = engine.getPlayerName(targetId);
    if (!engine.callSpecialElection(socket.id, targetId)) return;

    io.to(room.code).emit('game:executive-action-notification', {
      action: 'special-election',
      presidentName: engine.getPlayerName(socket.id),
      targetName,
    });
    io.to(room.code).emit('game:state-update', engine.getPublicState());
  });

  socket.on('game:execute-player', ({ targetId }) => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    const result = engine.executePlayer(socket.id, targetId);
    if (!result) return;

    io.to(room.code).emit('game:executive-action-notification', {
      action: 'execution',
      presidentName: engine.getPlayerName(engine.getPresidentId()),
      targetName: result.targetName,
    });

    if (result.hitlerKilled) {
      io.to(room.code).emit('game:state-update', engine.getPublicState());
      io.to(room.code).emit('game:over', engine.getGameOverPayload()!);
      return;
    }

    engine.advanceToNextRound();
    io.to(room.code).emit('game:state-update', engine.getPublicState());
  });

  socket.on('game:policy-peek-acknowledge', () => {
    const ctx = getRoomAndEngine(socket.id);
    if (!ctx) return;
    const { room, engine } = ctx;

    if (socket.id !== engine.getPresidentId()) return;
    engine.acknowledgePolicyPeek();
    engine.advanceToNextRound();
    io.to(room.code).emit('game:state-update', engine.getPublicState());
  });

  socket.on('game:play-again', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room) return;

    if (!room.isHost(socket.id)) {
      socket.emit('lobby:error', { message: 'Only the host can restart the game.' });
      return;
    }

    // Re-shuffle roles and start a fresh game in the same room
    room.resetGame();
    room.startGame();

    io.to(room.code).emit('game:started');

    for (const playerId of room.getPlayerIds()) {
      const dossier = room.getDossierFor(playerId);
      if (dossier) {
        io.to(playerId).emit('game:dossier-reveal', dossier);
      }
    }

    console.log(`[game] Room ${room.code} replayed with ${room.playerCount} players`);
  });
}
