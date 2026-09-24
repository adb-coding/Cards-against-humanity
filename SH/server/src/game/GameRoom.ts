import type { LobbyPlayer, PlayerState, DossierRevealPayload, Role, Team } from 'shared';
import { HITLER_KNOWS_FASCISTS_MAX_PLAYERS } from 'shared';
import { assignRoles } from './RoleAssigner.js';
import { GameEngine } from './GameEngine.js';

function teamForRole(role: Role): Team {
  return role === 'liberal' ? 'liberal' : 'fascist';
}

export class GameRoom {
  readonly code: string;
  private players: Map<string, { name: string; isHost: boolean }> = new Map();
  private state: PlayerState[] = [];
  private started = false;
  private engine: GameEngine | null = null;
  private dossierReadyPlayers: Set<string> = new Set();

  constructor(code: string) {
    this.code = code;
  }

  addPlayer(id: string, name: string, isHost: boolean): void {
    this.players.set(id, { name, isHost });
  }

  removePlayer(id: string): void {
    const wasHost = this.players.get(id)?.isHost ?? false;
    this.players.delete(id);

    if (wasHost && this.players.size > 0) {
      const firstKey = this.players.keys().next().value!;
      this.players.get(firstKey)!.isHost = true;
    }
  }

  hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  hasName(name: string): boolean {
    for (const p of this.players.values()) {
      if (p.name.toLowerCase() === name.toLowerCase()) return true;
    }
    return false;
  }

  get playerCount(): number {
    return this.players.size;
  }

  get isStarted(): boolean {
    return this.started;
  }

  get isEmpty(): boolean {
    return this.players.size === 0;
  }

  isHost(id: string): boolean {
    return this.players.get(id)?.isHost ?? false;
  }

  getLobbyPlayers(): LobbyPlayer[] {
    return Array.from(this.players.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      isHost: p.isHost,
    }));
  }

  startGame(): void {
    const ids = Array.from(this.players.keys());
    const roles = assignRoles(ids.length);

    this.state = ids.map((id, i) => ({
      id,
      name: this.players.get(id)!.name,
      role: roles[i],
      team: teamForRole(roles[i]),
    }));

    this.started = true;
  }

  initEngine(): void {
    this.engine = new GameEngine(this.state);
  }

  resetGame(): void {
    this.state = [];
    this.started = false;
    this.engine = null;
    this.dossierReadyPlayers.clear();
  }

  getEngine(): GameEngine | null {
    return this.engine;
  }

  markDossierReady(playerId: string): boolean {
    this.dossierReadyPlayers.add(playerId);
    return this.dossierReadyPlayers.size >= this.players.size;
  }

  getDossierFor(socketId: string): DossierRevealPayload | null {
    const me = this.state.find((p) => p.id === socketId);
    if (!me) return null;

    const fascists = this.state.filter((p) => p.role === 'fascist');
    const hitler = this.state.find((p) => p.role === 'hitler');

    const payload: DossierRevealPayload = {
      you: { name: me.name, role: me.role, team: me.team },
      knownFascists: [],
      knownHitler: null,
    };

    if (me.role === 'fascist') {
      payload.knownFascists = fascists.filter((p) => p.id !== socketId).map((p) => p.name);
      payload.knownHitler = hitler?.name ?? null;
    } else if (me.role === 'hitler' && this.state.length <= HITLER_KNOWS_FASCISTS_MAX_PLAYERS) {
      payload.knownFascists = fascists.map((p) => p.name);
    }

    return payload;
  }

  getPlayerIds(): string[] {
    return Array.from(this.players.keys());
  }
}
