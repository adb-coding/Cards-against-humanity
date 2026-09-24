import { CardDeck } from './CardDeck.js';
import { getDeck, sanitizeSettings } from '../data/index.js';

export const HAND_SIZE = 7;
export const WIN_SCORE = 8;

export class Room {
  constructor(code, hostId, hostName, options) {
    this.code = code;
    this.phase = 'lobby'; // lobby | playing | reading | judging | scoring | ended
    this.hostId = hostId;
    this.round = 0;
    this.czarIndex = 0;
    this.currentBlackCard = null;
    this.submissions = new Map(); // socketId -> WhiteCard[]
    this.submissionOrder = []; // shuffled socketIds for anonymous reveal
    this.revealed = new Set(); // submissionIds the czar has read
    this.roundWinner = null;

    this.applySettings(options);

    this.players = new Map();
    this.addPlayer(hostId, hostName);
  }

  /** Validates and applies lobby settings, rebuilding the decks. */
  applySettings(input) {
    this.settings = sanitizeSettings(input, this.settings);
    const { black, white } = getDeck(this.settings.lang, this.settings.expansions);
    this.blackDeck = new CardDeck(black);
    this.whiteDeck = new CardDeck(white);
    return this.settings;
  }

  addPlayer(id, name) {
    this.players.set(id, {
      id,
      name,
      hand: [],
      score: 0,
      redrawsUsed: 0,
      isConnected: true,
    });
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  getPlayer(id) {
    return this.players.get(id);
  }

  hasName(name) {
    const lower = name.toLowerCase();
    return [...this.players.values()].some((p) => p.name.toLowerCase() === lower);
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

  /** Redraws left for a player, or -1 when unlimited. */
  redrawsLeft(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return 0;
    if (this.settings.redraws < 0) return -1;
    return Math.max(0, this.settings.redraws - player.redrawsUsed);
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

  /** Back to the lobby with fresh scores, keeping players and settings. */
  resetToLobby() {
    this.phase = 'lobby';
    this.round = 0;
    this.czarIndex = 0;
    this.currentBlackCard = null;
    this.submissions.clear();
    this.submissionOrder = [];
    this.revealed.clear();
    this.roundWinner = null;
    this.applySettings(this.settings);
    for (const player of this.players.values()) {
      player.hand = [];
      player.score = 0;
      player.redrawsUsed = 0;
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
