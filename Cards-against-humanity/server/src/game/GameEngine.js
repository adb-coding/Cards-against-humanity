import { WIN_SCORE } from './Room.js';

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
    room.revealed.clear();
    room.roundWinner = null;

    return {
      phase: room.phase,
      round: room.round,
      czarId: room.getCzarId(),
      blackCard: room.currentBlackCard,
      players: room.getPlayerList(),
      scores: room.getScores(),
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

    return {
      allSubmitted,
      submittedIds: [...room.submissions.keys()],
      submittedCount: room.submissions.size,
      totalNeeded: nonCzarIds.length,
    };
  },

  /**
   * Swap a player's whole hand for fresh cards (limited by the room's redraw setting).
   */
  redrawHand(room, playerId) {
    if (room.phase !== 'playing') return { error: 'You can only redraw while cards are being picked.' };
    if (room.submissions.has(playerId)) return { error: 'You already submitted this round.' };
    const player = room.getPlayer(playerId);
    if (!player) return { error: 'Player not found.' };
    if (room.redrawsLeft(playerId) === 0) return { error: 'No redraws left.' };

    player.hand = room.whiteDeck.drawMany(player.hand.length || 7);
    player.redrawsUsed += 1;
    return { hand: player.hand, redrawsLeft: room.redrawsLeft(playerId) };
  },

  /**
   * Once everyone has submitted, the Czar reads the anonymous answers privately
   * ('reading') before they are shown to everyone ('judging').
   * Returns anonymized submissions array.
   */
  buildReadingState(room) {
    room.phase = 'reading';
    room.revealed.clear();

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

  getAnonymousSubmissions(room) {
    return room.submissionOrder.map((pid, index) => ({
      submissionId: index,
      cards: room.submissions.get(pid),
    }));
  },

  /** The Czar flips one answer card while reading. */
  revealSubmission(room, czarId, submissionId) {
    if (room.phase !== 'reading') return { error: 'Not in reading phase.' };
    if (czarId !== room.getCzarId()) return { error: 'Only the Card Czar can read the answers.' };
    if (!Number.isInteger(submissionId) || submissionId < 0 || submissionId >= room.submissionOrder.length) {
      return { error: 'Invalid submission ID.' };
    }
    room.revealed.add(submissionId);
    return { revealed: [...room.revealed] };
  },

  /** The Czar has read every answer: show them to all players. */
  startJudging(room, czarId) {
    if (room.phase !== 'reading') return { error: 'Not in reading phase.' };
    if (czarId !== room.getCzarId()) return { error: 'Only the Card Czar can continue.' };
    if (room.revealed.size < room.submissionOrder.length) return { error: 'Read every answer first.' };
    room.phase = 'judging';
    return { phase: room.phase, submissions: this.getAnonymousSubmissions(room) };
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

    const authors = room.submissionOrder.map((pid, index) => ({
      submissionId: index,
      playerId: pid,
      name: room.getPlayer(pid)?.name ?? 'Someone who left',
    }));

    return {
      phase: room.phase,
      winnerId,
      winnerName: winnerPlayer.name,
      winningSubmissionId: submissionId,
      authors,
      winningCards: room.submissions.get(winnerId),
      scores: room.getScores(),
      gameOver,
    };
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
    room.revealed.clear();
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
