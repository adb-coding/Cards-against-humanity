import { WIN_SCORE, HAND_SIZE } from './Room.js';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const GameEngine = {
  /**
   * Start the game from lobby.
   * Returns initial game state to broadcast.
   */
  startGame(room) {
    if (room.phase !== 'lobby') return { error: 'Game already started.' };
    if (room.players.size < 2) return { error: 'Need at least 2 players to start.' };

    room.phase = 'playing';
    room.round = 1;
    room.czarIndex = 0;
    room.currentBlackCard = room.blackDeck.draw();
    room.dealInitialHands();
    room.submissions.clear();
    room.submissionOrder = [];
    room.roundWinner = null;

    return {
      phase: room.phase,
      round: room.round,
      czarId: room.getCzarId(),
      blackCard: room.currentBlackCard,
      players: room.getPlayerList(),
      scores: room.getScores(),
      maxRedraws: room.maxRedraws,
    };
  },

  /**
   * Get private hand for a specific player.
   */
  getPlayerHand(room, playerId) {
    const player = room.getPlayer(playerId);
    return player ? player.hand : [];
  },

  /**
   * Submit white cards for a non-czar player.
   * Returns { allSubmitted: bool } or { error }
   */
  submitCards(room, playerId, cardIds) {
    if (room.phase !== 'playing') return { error: 'Not in playing phase.' };
    if (playerId === room.getCzarId()) return { error: 'Card Czar cannot submit cards.' };
    if (room.submissions.has(playerId)) return { error: 'Already submitted.' };

    const player = room.getPlayer(playerId);
    if (!player) return { error: 'Player not found.' };

    const required = room.currentBlackCard.pick;
    if (cardIds.length !== required) {
      return { error: `Must submit exactly ${required} card(s).` };
    }

    const selectedCards = cardIds.map((id) => player.hand.find((c) => c.id === id)).filter(Boolean);
    if (selectedCards.length !== required) return { error: 'Invalid card IDs.' };

    // Remove submitted cards from hand
    player.hand = player.hand.filter((c) => !cardIds.includes(c.id));
    room.submissions.set(playerId, selectedCards);

    // Check if all non-czar players have submitted
    const czarId = room.getCzarId();
    const nonCzarIds = [...room.players.keys()].filter((id) => id !== czarId);
    const allSubmitted = nonCzarIds.every((id) => room.submissions.has(id));

    return { allSubmitted, submittedCount: room.submissions.size, totalNeeded: nonCzarIds.length };
  },

  /**
   * Transition to judging phase once all players have submitted.
   * Returns anonymized submissions array.
   */
  buildJudgingState(room) {
    room.phase = 'judging';

    // Shuffle submission order for anonymity
    const playerIds = [...room.submissions.keys()];
    room.submissionOrder = shuffleArray(playerIds);

    // Build anonymous submissions (submissionId = index in shuffled order)
    const submissions = room.submissionOrder.map((pid, index) => ({
      submissionId: index,
      cards: room.submissions.get(pid),
    }));

    return { phase: room.phase, submissions };
  },

  /**
   * Czar judges a winner by submissionId.
   * Returns round result or { error }.
   */
  judgeWinner(room, czarId, submissionId) {
    if (room.phase !== 'judging') return { error: 'Not in judging phase.' };
    if (czarId !== room.getCzarId()) return { error: 'Only the Card Czar can judge.' };
    if (submissionId < 0 || submissionId >= room.submissionOrder.length) {
      return { error: 'Invalid submission ID.' };
    }

    const winnerId = room.submissionOrder[submissionId];
    const winnerPlayer = room.getPlayer(winnerId);
    winnerPlayer.score += 1;

    room.roundWinner = winnerId;
    room.phase = 'scoring';

    const gameOver = winnerPlayer.score >= WIN_SCORE;

    return {
      phase: room.phase,
      winnerId,
      winnerName: winnerPlayer.name,
      winningCards: room.submissions.get(winnerId),
      scores: room.getScores(),
      gameOver,
    };
  },

  /**
   * Redraw entire hand for a player.
   */
  redrawHand(room, playerId) {
    if (room.phase !== 'playing') return { error: 'Not in playing phase.' };
    if (playerId === room.getCzarId()) return { error: 'Card Czar cannot redraw.' };

    const player = room.getPlayer(playerId);
    if (!player) return { error: 'Player not found.' };
    if (player.redraws >= room.maxRedraws) return { error: 'No redraws remaining.' };

    room.whiteDeck.discard(player.hand);
    player.hand = room.whiteDeck.drawMany(HAND_SIZE);
    player.redraws += 1;

    return { hand: player.hand, redraws: player.redraws, maxRedraws: room.maxRedraws };
  },

  /**
   * Advance to the next round.
   * Returns next round state or game-over state.
   */
  nextRound(room) {
    if (room.phase !== 'scoring') return { error: 'Not in scoring phase.' };

    room.advanceCzar();
    room.round += 1;
    room.currentBlackCard = room.blackDeck.draw();
    room.submissions.clear();
    room.submissionOrder = [];
    room.roundWinner = null;
    room.replenishHands();
    room.phase = 'playing';

    return {
      phase: room.phase,
      round: room.round,
      czarId: room.getCzarId(),
      blackCard: room.currentBlackCard,
      scores: room.getScores(),
    };
  },
};
