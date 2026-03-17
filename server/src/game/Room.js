import { CardDeck } from './CardDeck.js';
import { blackCards, whiteCards } from '../data/cards.js';

export const HAND_SIZE = 7;
export const WIN_SCORE = 8;

export class Room {
  constructor(code, hostId, hostName) {
    this.code = code;
    this.phase = 'lobby'; // lobby | playing | judging | scoring | ended
    this.hostId = hostId;
    this.round = 0;
    this.czarIndex = 0;
    this.currentBlackCard = null;
    this.submissions = new Map(); // socketId -> WhiteCard[]
    this.submissionOrder = []; // shuffled socketIds for anonymous reveal
    this.roundWinner = null;

    this.blackDeck = new CardDeck(blackCards);
    this.whiteDeck = new CardDeck(whiteCards);

    this.players = new Map();
    this.addPlayer(hostId, hostName);
  }

  addPlayer(id, name) {
    this.players.set(id, {
      id,
      name,
      hand: [],
      score: 0,
      isConnected: true,
    });
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  getPlayer(id) {
    return this.players.get(id);
  }

  getPlayerList() {
    return Array.from(this.players.values()).map(({ id, name, score, isConnected }) => ({
      id,
      name,
      score,
      isConnected,
    }));
  }

  getOrderedPlayers() {
    return Array.from(this.players.keys());
  }

  getCzarId() {
    const playerIds = this.getOrderedPlayers();
    return playerIds[this.czarIndex % playerIds.length];
  }

  advanceCzar() {
    this.czarIndex = (this.czarIndex + 1) % this.players.size;
  }

  dealInitialHands() {
    for (const player of this.players.values()) {
      player.hand = this.whiteDeck.drawMany(HAND_SIZE);
    }
  }

  replenishHands() {
    for (const player of this.players.values()) {
      const needed = HAND_SIZE - player.hand.length;
      if (needed > 0) {
        player.hand.push(...this.whiteDeck.drawMany(needed));
      }
    }
  }

  getScores() {
    const scores = {};
    for (const [id, player] of this.players) {
      scores[id] = player.score;
    }
    return scores;
  }
}
