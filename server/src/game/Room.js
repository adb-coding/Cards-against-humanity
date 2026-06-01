import { CardDeck } from './CardDeck.js';
import { getDeck } from '../data/index.js';

export const HAND_SIZE = 7;
export const WIN_SCORE = 8;

export class Room {
  constructor(code, hostId, hostName, options = { lang: 'en', expansions: ['base'] }) {
    this.code = code;
    this.phase = 'lobby'; // lobby | playing | judging | scoring | ended
    this.hostId = hostId;
    this.round = 0;
    this.czarIndex = 0;
    this.currentBlackCard = null;
    this.submissions = new Map(); // socketId -> WhiteCard[]
    this.submissionOrder = []; // shuffled socketIds for anonymous reveal
    this.roundWinner = null;
    this.maxRedraws = options.maxRedraws ?? 1;

    const { black, white } = getDeck(options.lang, options.expansions);
    this.blackDeck = new CardDeck(black);
    this.whiteDeck = new CardDeck(white);

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
      redraws: 0,
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

  replacePlayerId(oldId, newId) {
    const player = this.players.get(oldId);
    if (!player) return null;
    player.id = newId;
    this.players.delete(oldId);
    this.players.set(newId, player);
    if (this.hostId === oldId) this.hostId = newId;
    const soIdx = this.submissionOrder.indexOf(oldId);
    if (soIdx !== -1) this.submissionOrder[soIdx] = newId;
    if (this.submissions.has(oldId)) {
      const sub = this.submissions.get(oldId);
      this.submissions.delete(oldId);
      this.submissions.set(newId, sub);
    }
    return player;
  }
}
