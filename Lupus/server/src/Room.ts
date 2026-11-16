import { randomInt, randomUUID } from 'node:crypto';
import {
  MAX_PLAYERS,
  ROLES,
  checkDeck,
  deckCounts,
  recommendedRoles,
  sanitizeRoles,
  type Faction,
  type GameOverView,
  type GameView,
  type NarrationCue,
  type NarrationEntry,
  type NarratorStepView,
  type NightAction,
  type NightStepId,
  type Note,
  type Phase,
  type RoleId,
  type Settings,
  type SettingsPatch,
  type VoteResult,
} from 'lupus-shared';

/** Every duration the game uses, in milliseconds (overridable in tests). */
export interface Timing {
  /** A step nobody can play (dead role...) lasts a random time in this range, like a moderator faking the call. */
  fakeMin: number;
  fakeMax: number;
  /** Automatic narrator: how long a role has before its step is skipped. */
  actTimeout: number;
  wolvesTimeout: number;
  infoTimeout: number;
  /** Pause between a role finishing and the next one being called. */
  settleMin: number;
  settleMax: number;
  /**
   * Added to every night step when the night is read aloud: players have their eyes closed,
   * so they need time to hear the call and open them.
   */
  audioExtra: number;
  /** How long the host must be offline before another player may take over. */
  hostClaimAfter: number;
  /** Lobby only: offline players are dropped after this long. */
  lobbyDropAfter: number;
  /** A game nobody is connected to is deleted after this long. */
  idleRoomTtl: number;
}

export const DEFAULT_TIMING: Timing = {
  fakeMin: 7_000,
  fakeMax: 13_000,
  actTimeout: 75_000,
  wolvesTimeout: 120_000,
  infoTimeout: 40_000,
  settleMin: 1_500,
  settleMax: 3_500,
  audioExtra: 6_000,
  hostClaimAfter: 20_000,
  lobbyDropAfter: 5 * 60_000,
  idleRoomTtl: 3 * 60 * 60_000,
};

export interface Player {
  id: string;
  /** Secret that lets a browser get its seat back after a refresh. */
  token: string;
  name: string;
  socketId: string | null;
  offlineSince: number | null;
  isHost: boolean;
  /** Current role; null in the lobby and for the human narrator. */
  role: RoleId | null;
  originalRole: RoleId | null;
  alive: boolean;
  left: boolean;
  seenCard: boolean;
  notes: Note[];
}

type StepKind = 'info' | 'pick' | 'wolves';

interface Step {
  id: NightStepId;
  /** Living players who play this step. */
  actorIds: string[];
  /** Nobody can play it: the role is only "called" so that nobody learns it is gone. */
  fake: boolean;
  decided: boolean;
  targetId: string | null;
  /** Wolves: what each wolf currently wants. */
  picks: Record<string, string | null>;
  /** Text shown to each actor (information for 'info' steps, outcome for the others). */
  results: Record<string, string>;
  acks: string[];
  /** Earliest time the step may end, so that a quick real step looks like a faked one. */
  minEnd: number;
  deadline: number | null;
  closing: boolean;
}

interface Night {
  steps: NightStepId[];
  index: number;
  step: Step;
  /** Final choice of each role this night (absent/null when the role did nothing). */
  actions: Partial<Record<NightStepId, string | null>>;
}

interface Vote {
  round: 1 | 2;
  candidates: string[];
  voters: string[];
  ballots: Record<string, string>;
}

const STEP_KIND: Record<NightStepId, StepKind> = {
  massoni: 'info',
  medium: 'info',
  prostituta: 'pick',
  guardia: 'pick',
  veggente: 'pick',
  lupi: 'wolves',
  cacciatore: 'pick',
  mitomane: 'pick',
};

const STEP_TITLE: Record<NightStepId, string> = {
  massoni: 'I Massoni',
  medium: 'Il Medium',
  prostituta: 'La Prostituta',
  guardia: 'La Guardia',
  veggente: 'Il Veggente',
  lupi: 'I Lupi Mannari',
  cacciatore: 'Il Cacciatore',
  mitomane: 'Il Mitomane',
};

const STEP_CALL: Record<NightStepId, string> = {
  massoni: 'I Massoni aprono gli occhi e si riconoscono.',
  medium: 'Il Medium apre gli occhi e interroga gli spiriti.',
  prostituta: 'La Prostituta apre gli occhi e sceglie da chi passare la notte.',
  guardia: 'La Guardia apre gli occhi e sceglie chi proteggere.',
  veggente: 'Il Veggente apre gli occhi e sceglie chi scrutare.',
  lupi: 'I Lupi Mannari aprono gli occhi e scelgono chi sbranare.',
  cacciatore: 'Il Cacciatore apre gli occhi: sparerà stanotte?',
  mitomane: 'Il Mitomane apre gli occhi e sceglie chi imitare.',
};

const STEP_CLOSE: Record<NightStepId, string> = {
  massoni: 'I Massoni chiudono gli occhi.',
  medium: 'Il Medium chiude gli occhi.',
  prostituta: 'La Prostituta chiude gli occhi.',
  guardia: 'La Guardia chiude gli occhi.',
  veggente: 'Il Veggente chiude gli occhi.',
  lupi: 'I Lupi Mannari chiudono gli occhi.',
  cacciatore: 'Il Cacciatore chiude gli occhi.',
  mitomane: 'Il Mitomane chiude gli occhi.',
};

const STEP_PROMPT: Record<NightStepId, { prompt: string; verb: string; skip: string }> = {
  massoni: { prompt: 'Riconosci il tuo compagno.', verb: '', skip: '' },
  medium: { prompt: 'Gli spiriti ti parlano.', verb: '', skip: '' },
  prostituta: { prompt: 'Da chi vuoi passare la notte?', verb: 'Vai da', skip: 'Resta a casa' },
  guardia: { prompt: 'Chi vuoi proteggere stanotte?', verb: 'Proteggi', skip: 'Nessuno' },
  veggente: { prompt: 'Chi vuoi scrutare?', verb: 'Scruta', skip: 'Nessuno' },
  lupi: { prompt: 'Scegliete insieme chi sbranare: dovete essere tutti d’accordo.', verb: 'Sbrana', skip: 'Nessuna vittima' },
  cacciatore: { prompt: 'Hai un solo colpo: vuoi sparare stanotte?', verb: 'Spara a', skip: 'Non sparare' },
  mitomane: { prompt: 'Chi vuoi imitare?', verb: 'Imita', skip: 'Nessuno' },
};

/** Steps whose outcome the player must read and confirm before the night moves on. */
const NEEDS_ACK = new Set<NightStepId>(['massoni', 'medium', 'veggente', 'mitomane']);

const LOG_LIMIT = 150;

function rand(min: number, max: number): number {
  return max <= min ? min : min + randomInt(max - min + 1);
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export interface RoomHooks {
  /** Something changed: every connected player needs a fresh view. */
  onChange: () => void;
  /** One-off message for everybody in the room. */
  onNotice: (message: string) => void;
  /** A seat was removed: tell that socket its session is over. */
  onRemoved: (socketId: string, message: string) => void;
}

export class Room {
  readonly code: string;
  players: Player[] = [];
  settings: Settings;
  phase: Phase = 'lobby';
  round = 0;
  narratorId: string | null = null;
  night: Night | null = null;
  vote: Vote | null = null;
  lastVote: VoteResult | null = null;
  nightDeaths: string[] = [];
  winner: Faction | null = null;
  journal: Note[] = [];

  private deck: Record<RoleId, number> | null = null;
  private log: NarrationEntry[] = [];
  private logSeq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private discussionEndsAt: number | null = null;
  /** Who was lynched during the last day, for the Medium. */
  private lastLynch: { name: string; wasWolf: boolean } | null = null;
  private guardLastProtected: string | null = null;
  private hunterUsed = false;
  private masonsMet = false;
  private endReason = '';

  constructor(
    code: string,
    private readonly timing: Timing,
    private readonly hooks: RoomHooks,
  ) {
    this.code = code;
    this.settings = {
      narrator: 'auto',
      narratorId: null,
      audio: 'off',
      secretVote: false,
      discussionSeconds: 180,
      autoRoles: true,
      roles: recommendedRoles(1),
    };
  }

  // ───────────────────────── Players & sessions ─────────────────────────

  private get active(): Player[] {
    return this.players.filter((p) => !p.left);
  }

  /** Players holding a card in the current game, in seat order. */
  private get seats(): Player[] {
    return this.players.filter((p) => p.role !== null);
  }

  private get alive(): Player[] {
    return this.seats.filter((p) => p.alive);
  }

  private get host(): Player | undefined {
    return this.active.find((p) => p.isHost);
  }

  private get auto(): boolean {
    return this.narratorId === null;
  }

  get isEmpty(): boolean {
    return this.active.length === 0;
  }

  get(id: string | null | undefined): Player | undefined {
    return id ? this.players.find((p) => p.id === id) : undefined;
  }

  findByToken(token: string): Player | undefined {
    return token ? this.active.find((p) => p.token === token) : undefined;
  }

  /** Number of players who will receive a card. */
  private get roleCount(): number {
    return this.active.length - (this.settings.narrator === 'human' ? 1 : 0);
  }

  /** Keeps the lobby settings consistent with who is actually in the room. */
  private refreshAutoRoles(): void {
    if (this.phase !== 'lobby') return;
    const chosen = this.settings.narratorId;
    if (chosen && !this.active.some((p) => p.id === chosen)) this.settings.narratorId = null;
    if (this.settings.autoRoles) this.settings.roles = recommendedRoles(this.roleCount);
  }

  /**
   * Who moves the game from one phase to the next: the narrator when a player narrates,
   * otherwise the host. The host always remains in charge of the room itself.
   */
  private canDrive(playerId: string): boolean {
    const player = this.get(playerId);
    if (!player || player.left) return false;
    if (this.phase === 'ended') return player.isHost || player.id === this.narratorId;
    return this.narratorId ? player.id === this.narratorId : player.isHost;
  }

  private ensureHost(): void {
    const active = this.active;
    if (active.length === 0 || active.some((p) => p.isHost)) return;
    for (const p of this.players) p.isHost = false;
    (active.find((p) => p.socketId) ?? active[0]).isHost = true;
  }

  /** Adds a player to the lobby, or hands a disconnected seat back to someone rejoining by name mid-game. */
  join(rawName: string): { player: Player } | { error: string } {
    const name = rawName.trim().slice(0, 20);
    if (!name) return { error: 'Inserisci il tuo nome.' };

    if (this.phase !== 'lobby') {
      const seat = this.active.find((p) => !p.socketId && sameName(p.name, name));
      if (!seat) return { error: 'La partita è già iniziata.' };
      seat.token = randomUUID();
      return { player: seat };
    }
    if (this.active.length >= MAX_PLAYERS + 1) return { error: 'La stanza è piena.' };
    if (this.active.some((p) => sameName(p.name, name))) {
      return { error: 'C’è già un giocatore con questo nome.' };
    }

    const player: Player = {
      id: randomUUID().slice(0, 8),
      token: randomUUID(),
      name,
      socketId: null,
      offlineSince: Date.now(),
      isHost: this.active.length === 0,
      role: null,
      originalRole: null,
      alive: true,
      left: false,
      seenCard: false,
      notes: [],
    };
    this.players.push(player);
    this.refreshAutoRoles();
    return { player };
  }

  /** Binds a socket to a seat. Returns the socket that previously held it, if any. */
  attach(player: Player, socketId: string): string | null {
    const previous = player.socketId && player.socketId !== socketId ? player.socketId : null;
    player.socketId = socketId;
    player.offlineSince = null;
    this.changed();
    return previous;
  }

  detach(socketId: string): void {
    const player = this.players.find((p) => p.socketId === socketId);
    if (!player) return;
    player.socketId = null;
    player.offlineSince = Date.now();
    this.changed();
  }

  /** The player walks away for good (or is removed by the host). */
  leave(playerId: string, message = 'Hai lasciato la stanza.'): void {
    const player = this.get(playerId);
    if (!player || player.left) return;
    const socketId = player.socketId;

    if (this.phase === 'lobby') {
      this.players = this.players.filter((p) => p !== player);
    } else if (this.phase === 'ended') {
      player.left = true; // stays in the final role reveal until the next game
    } else if (player.id === this.narratorId) {
      // Nobody else may see every role, so the game cannot go on without its narrator.
      this.players = this.players.filter((p) => p !== player);
      this.backToLobby();
      this.hooks.onNotice('Il narratore ha lasciato la partita: si torna nella sala d’attesa.');
    } else {
      this.removeFromGame(player);
    }
    player.token = '';
    player.socketId = null;
    this.ensureHost();
    this.refreshAutoRoles();
    if (socketId) this.hooks.onRemoved(socketId, message);
    this.changed();
  }

  kick(byId: string, targetId: string): string | null {
    if (!this.get(byId)?.isHost) return 'Solo il master può rimuovere un giocatore.';
    const target = this.get(targetId);
    if (!target || target.left || target.id === byId) return null;
    this.leave(target.id, 'Il master ti ha rimosso dalla stanza.');
    return null;
  }

  /** Another player takes over when the host has been offline for a while. */
  claimHost(playerId: string): string | null {
    const claimant = this.get(playerId);
    const host = this.host;
    if (!claimant || claimant.left || !host || host === claimant) return null;
    if (host.socketId || host.offlineSince === null || Date.now() - host.offlineSince < this.timing.hostClaimAfter) {
      return 'Il master è ancora collegato.';
    }
    if (host.id === this.narratorId && this.phase !== 'lobby' && this.phase !== 'ended') {
      // A human narrator cannot be replaced mid-game without revealing every role.
      this.backToLobby();
      this.hooks.onNotice('Il narratore non è più collegato: la partita è stata interrotta.');
    }
    host.isHost = false;
    claimant.isHost = true;
    this.refreshAutoRoles();
    this.hooks.onNotice(`${claimant.name} è il nuovo master.`);
    this.changed();
    return null;
  }

  /** Periodic cleanup. Returns true when the room should be deleted. */
  sweep(now: number): boolean {
    if (this.phase === 'lobby') {
      const stale = this.players.filter(
        (p) => !p.socketId && p.offlineSince !== null && now - p.offlineSince > this.timing.lobbyDropAfter,
      );
      if (stale.length > 0) {
        this.players = this.players.filter((p) => !stale.includes(p));
        this.ensureHost();
        this.refreshAutoRoles();
        this.changed();
      }
    }
    const active = this.active;
    if (active.length === 0) return true;
    if (active.some((p) => p.socketId)) return false;
    const lastSeen = Math.max(...active.map((p) => p.offlineSince ?? now));
    return now - lastSeen > this.timing.idleRoomTtl;
  }

  dispose(): void {
    this.clearTimer();
  }

  // ───────────────────────── Lobby ─────────────────────────

  updateSettings(playerId: string, patch: SettingsPatch): string | null {
    if (!this.get(playerId)?.isHost) return 'Solo il master può cambiare le impostazioni.';
    if (this.phase !== 'lobby') return null;
    const s = this.settings;
    if (patch.narrator === 'auto' || patch.narrator === 'human') s.narrator = patch.narrator;
    if (patch.narratorId !== undefined) {
      const chosen = this.active.find((p) => p.id === patch.narratorId);
      s.narratorId = chosen ? chosen.id : null;
    }
    if (patch.audio === 'off' || patch.audio === 'master' || patch.audio === 'all') s.audio = patch.audio;
    if (typeof patch.secretVote === 'boolean') s.secretVote = patch.secretVote;
    if (typeof patch.discussionSeconds === 'number' && Number.isFinite(patch.discussionSeconds)) {
      s.discussionSeconds = Math.min(900, Math.max(0, Math.round(patch.discussionSeconds)));
    }
    if (patch.roles) {
      s.roles = sanitizeRoles(patch.roles, s.roles);
      s.autoRoles = false;
    }
    if (typeof patch.autoRoles === 'boolean') s.autoRoles = patch.autoRoles;
    this.refreshAutoRoles();
    this.changed();
    return null;
  }

  /**
   * Deals the cards and starts the game.
   * `forcedDeal` (tests only) assigns the given roles to the seats in order instead of shuffling.
   */
  start(playerId: string, forcedDeal?: RoleId[]): string | null {
    const host = this.get(playerId);
    if (!host?.isHost) return 'Solo il master può iniziare la partita.';
    if (this.phase !== 'lobby') return null;
    if (this.active.some((p) => !p.socketId)) {
      return 'Ci sono giocatori disconnessi: attendili o rimuovili prima di iniziare.';
    }
    const check = checkDeck(this.settings.roles, this.roleCount);
    if (!check.ok) return check.error;

    const chosenNarrator = this.active.find((p) => p.id === this.settings.narratorId) ?? host;
    this.narratorId = this.settings.narrator === 'human' ? chosenNarrator.id : null;
    const seats = this.active.filter((p) => p.id !== this.narratorId);
    this.deck = deckCounts(this.settings.roles, seats.length);

    const cards: RoleId[] = [];
    for (const role of Object.keys(this.deck) as RoleId[]) {
      for (let i = 0; i < this.deck[role]; i++) cards.push(role);
    }
    if (cards.length !== seats.length) return 'Il mazzo non corrisponde al numero di giocatori.';
    const deal = forcedDeal ?? shuffle(cards);

    for (const p of this.players) {
      p.role = null;
      p.originalRole = null;
      p.alive = true;
      p.seenCard = false;
      p.notes = [];
    }
    seats.forEach((p, i) => {
      p.role = deal[i];
      p.originalRole = deal[i];
    });

    this.phase = 'setup';
    this.round = 0;
    this.night = null;
    this.vote = null;
    this.lastVote = null;
    this.nightDeaths = [];
    this.winner = null;
    this.endReason = '';
    this.journal = [];
    this.log = [];
    this.lastLynch = null;
    this.guardLastProtected = null;
    this.hunterUsed = false;
    this.masonsMet = false;
    this.discussionEndsAt = null;
    this.say('Benvenuti a Tabula. Ognuno guardi in segreto la propria carta: quando cala la notte, il villaggio non è più al sicuro…', 'day');
    this.changed();
    return null;
  }

  seenCard(playerId: string): void {
    const player = this.get(playerId);
    if (!player || player.role === null || player.seenCard) return;
    player.seenCard = true;
    this.changed();
  }

  // ───────────────────────── Phase flow ─────────────────────────

  /** The master (or the narrator, when a player narrates) moves the game to its next phase. */
  advance(playerId: string, from: Phase): string | null {
    if (!this.canDrive(playerId)) {
      return `Solo il ${this.narratorId ? 'narratore' : 'master'} può far avanzare la partita.`;
    }
    if (from !== this.phase) return null; // stale tap
    switch (this.phase) {
      case 'setup':
      case 'verdict':
        this.startNight();
        break;
      case 'dawn':
        this.phase = 'discussion';
        this.discussionEndsAt =
          this.settings.discussionSeconds > 0 ? Date.now() + this.settings.discussionSeconds * 1000 : null;
        this.say('Il villaggio si riunisce in piazza. Discutete: chi tra voi è un lupo mannaro?', 'discussion');
        break;
      case 'discussion':
        this.openVote();
        break;
      case 'voting':
        this.closeVote();
        break;
      case 'ended':
        this.backToLobby();
        break;
      default:
        return null;
    }
    this.changed();
    return null;
  }

  abort(playerId: string): string | null {
    if (!this.get(playerId)?.isHost) return 'Solo il master può terminare la partita.';
    if (this.phase === 'lobby') return null;
    this.backToLobby();
    this.hooks.onNotice('Il master ha terminato la partita.');
    this.changed();
    return null;
  }

  private backToLobby(): void {
    this.clearTimer();
    this.players = this.players.filter((p) => !p.left);
    for (const p of this.players) {
      p.role = null;
      p.originalRole = null;
      p.alive = true;
      p.seenCard = false;
      p.notes = [];
    }
    this.phase = 'lobby';
    this.narratorId = null;
    this.night = null;
    this.vote = null;
    this.lastVote = null;
    this.nightDeaths = [];
    this.winner = null;
    this.deck = null;
    this.round = 0;
    this.log = [];
    this.discussionEndsAt = null;
    this.ensureHost();
    this.refreshAutoRoles();
  }

  /** Removes a card-holding player from a running game: for the village they simply die. */
  private removeFromGame(player: Player): void {
    const wasAlive = player.alive;
    player.left = true;
    player.alive = false;
    if (player.isHost) {
      player.isHost = false;
      this.ensureHost();
    }
    if (!wasAlive || this.phase === 'ended') return;

    this.say(`${player.name} ha abbandonato il villaggio.`, this.phase === 'night' ? 'night' : 'day');
    this.journal.push({ round: this.round, text: `${this.tag(player)} ha abbandonato la partita.` });

    if (this.vote) {
      const v = this.vote;
      v.candidates = v.candidates.filter((id) => id !== player.id);
      v.voters = v.voters.filter((id) => id !== player.id);
      delete v.ballots[player.id];
      for (const [voter, target] of Object.entries(v.ballots)) {
        if (target === player.id) delete v.ballots[voter];
      }
    }

    if (this.checkWin()) return;

    const step = this.night?.step;
    if (this.phase !== 'night' || !step) return;
    if (!step.decided) {
      for (const wolfId of Object.keys(step.picks)) {
        if (step.picks[wolfId] === player.id) step.picks[wolfId] = null;
      }
    }
    if (step.actorIds.includes(player.id)) {
      step.actorIds = step.actorIds.filter((id) => id !== player.id);
      delete step.picks[player.id];
      if (step.actorIds.length === 0 && !step.decided) {
        // Nobody is left to play this step: finish it like a faked call.
        step.fake = true;
        step.deadline = null;
        if (this.auto) this.schedule(Math.max(0, step.minEnd - Date.now()), () => this.advanceStep());
      } else {
        this.checkPackAgreement(step);
        this.settle();
      }
    }
  }

  // ───────────────────────── Night ─────────────────────────

  private startNight(): void {
    this.round += 1;
    this.phase = 'night';
    this.vote = null;
    this.nightDeaths = [];
    this.discussionEndsAt = null;

    const deck = this.deck!;
    const steps: NightStepId[] = [];
    if (this.round === 1 && deck.massone > 0) steps.push('massoni');
    if (this.round >= 2 && deck.medium > 0) steps.push('medium');
    if (deck.prostituta > 0) steps.push('prostituta');
    if (deck.guardia > 0) steps.push('guardia');
    if (deck.veggente > 0) steps.push('veggente');
    steps.push('lupi');
    if (deck.cacciatore > 0) steps.push('cacciatore');
    if (this.round === 1 && deck.mitomane > 0) steps.push('mitomane');

    this.say(`Cala la notte su Tabula. Tutti chiudono gli occhi… (notte ${this.round})`, 'night', 'night');
    this.night = { steps, index: 0, step: null as unknown as Step, actions: {} };
    this.startStep(0);
  }

  private actorsFor(id: NightStepId): Player[] {
    const withRole = (role: RoleId) => this.alive.filter((p) => p.role === role);
    switch (id) {
      case 'massoni':
        return withRole('massone');
      case 'lupi':
        return withRole('lupo');
      case 'cacciatore':
        return this.hunterUsed ? [] : withRole('cacciatore');
      default:
        return withRole(id);
    }
  }

  private targetsFor(id: NightStepId, actorId: string | null): string[] {
    if (STEP_KIND[id] === 'info') return [];
    return this.alive
      .filter((p) => {
        if (p.id === actorId) return false;
        if (id === 'lupi') return p.role !== 'lupo';
        if (id === 'guardia') return p.id !== this.guardLastProtected;
        return true;
      })
      .map((p) => p.id);
  }

  private canSkip(id: NightStepId, targets: string[]): boolean {
    return id === 'cacciatore' || targets.length === 0;
  }

  private startStep(index: number): void {
    const night = this.night!;
    const id = night.steps[index];
    const actors = this.actorsFor(id);
    const now = Date.now();
    const extra = this.settings.audio === 'off' ? 0 : this.timing.audioExtra;
    const step: Step = {
      id,
      actorIds: actors.map((p) => p.id),
      fake: actors.length === 0,
      decided: false,
      targetId: null,
      picks: {},
      results: {},
      acks: [],
      minEnd: now + extra + rand(this.timing.fakeMin, this.timing.fakeMax),
      deadline: null,
      closing: false,
    };
    night.index = index;
    night.step = step;
    this.say(STEP_CALL[id], 'night', id);

    if (id === 'massoni') {
      this.masonsMet = true;
      for (const mason of actors) {
        const others = this.seats.filter((p) => p.originalRole === 'massone' && p !== mason);
        const text =
          others.length > 0
            ? `Il tuo compagno massone è ${listNames(others.map((p) => p.name))}.`
            : 'Non ci sono altri massoni in gioco.';
        step.results[mason.id] = text;
        mason.notes.push({ round: this.round, text });
      }
    } else if (id === 'medium') {
      const text = this.lastLynch
        ? `Ieri il villaggio ha lapidato ${this.lastLynch.name}: ${this.lastLynch.wasWolf ? 'ERA un lupo mannaro.' : 'NON era un lupo mannaro.'}`
        : 'Ieri nessuno è stato lapidato: gli spiriti tacciono.';
      for (const medium of actors) {
        step.results[medium.id] = text;
        medium.notes.push({ round: this.round, text });
      }
    }

    if (!this.auto) return; // a human narrator calls the next role by hand
    if (step.fake) {
      this.schedule(step.minEnd - now, () => this.advanceStep());
      return;
    }
    const kind = STEP_KIND[id];
    const timeout =
      kind === 'info' ? this.timing.infoTimeout : kind === 'wolves' ? this.timing.wolvesTimeout : this.timing.actTimeout;
    step.deadline = now + extra + timeout;
    this.schedule(extra + timeout, () => this.forceStep());
  }

  /** Locks the outcome of a step and tells its actors what happened. */
  private decide(step: Step, targetId: string | null): void {
    const target = this.get(targetId);
    step.decided = true;
    step.targetId = target ? target.id : null;

    let text: string;
    switch (step.id) {
      case 'veggente':
        text = target
          ? `Hai scrutato ${target.name}: ${target.role === 'lupo' ? 'È un lupo mannaro!' : 'non è un lupo mannaro.'}`
          : 'Stanotte non hai scrutato nessuno.';
        break;
      case 'mitomane':
        if (!target) text = 'Non hai scelto nessuno: resterai un semplice villico.';
        else if (target.role === 'lupo') {
          text = `Hai scelto ${target.name}: è un lupo mannaro! Se sopravvivi alla notte, all’alba ti unirai al branco.`;
        } else text = `Hai scelto ${target.name}: non è un lupo mannaro. Resterai un semplice villico.`;
        break;
      case 'prostituta':
        text = target ? `Hai passato la notte a casa di ${target.name}.` : 'Stanotte sei rimasta a casa tua.';
        break;
      case 'guardia':
        text = target ? `Hai vegliato su ${target.name}.` : 'Stanotte non hai protetto nessuno.';
        break;
      case 'cacciatore':
        text = target ? `Hai sparato a ${target.name}.` : 'Hai tenuto il colpo in canna.';
        break;
      case 'lupi':
        text = target
          ? `Il branco ha scelto di sbranare ${target.name}.`
          : 'Il branco non ha trovato un accordo: stanotte nessuna vittima.';
        break;
      default:
        return;
    }
    const worthNoting = target !== undefined || step.id !== 'cacciatore';
    for (const id of step.actorIds) {
      step.results[id] = text;
      if (worthNoting) this.get(id)?.notes.push({ round: this.round, text });
    }
  }

  /** Wolves: the choice is locked as soon as every living wolf wants the same victim. */
  private checkPackAgreement(step: Step): void {
    if (step.id !== 'lupi' || step.decided || step.fake || step.actorIds.length === 0) return;
    const picks = step.actorIds.map((id) => step.picks[id] ?? null);
    if (picks[0] !== null && picks.every((pick) => pick === picks[0])) this.decide(step, picks[0]);
  }

  private isComplete(step: Step): boolean {
    if (step.fake) return false;
    const everyoneAcked = step.actorIds.every((id) => step.acks.includes(id));
    if (STEP_KIND[step.id] === 'info') return everyoneAcked;
    if (!step.decided) return false;
    return NEEDS_ACK.has(step.id) ? everyoneAcked : true;
  }

  /** Automatic narrator: once a step is complete, call the next role after a short pause. */
  private settle(): void {
    const step = this.night?.step;
    if (!this.auto || this.phase !== 'night' || !step || step.closing || !this.isComplete(step)) return;
    step.closing = true;
    step.deadline = null;
    const now = Date.now();
    const at = Math.max(step.minEnd, now + rand(this.timing.settleMin, this.timing.settleMax));
    this.schedule(at - now, () => this.advanceStep());
  }

  /** Automatic narrator: time is up. Wolves fall back to the most wanted victim, everyone else does nothing. */
  private forceStep(): void {
    const step = this.night?.step;
    if (this.phase !== 'night' || !step) return;
    if (!step.decided && STEP_KIND[step.id] !== 'info') {
      let target: string | null = null;
      if (step.id === 'lupi') {
        const counts = new Map<string, number>();
        for (const id of step.actorIds) {
          const pick = step.picks[id];
          if (pick) counts.set(pick, (counts.get(pick) ?? 0) + 1);
        }
        const best = Math.max(0, ...counts.values());
        const top = [...counts.entries()].filter(([, n]) => n === best).map(([id]) => id);
        if (top.length > 0) target = top[randomInt(top.length)];
      }
      this.decide(step, target);
    }
    this.advanceStep();
  }

  private currentStep(id: NightStepId): Step | null {
    const step = this.night?.step;
    return this.phase === 'night' && step && step.id === id ? step : null;
  }

  /** A role makes its choice (or a wolf proposes a victim). */
  nightAct(playerId: string, stepId: NightStepId, targetId: string | null): string | null {
    const step = this.currentStep(stepId);
    const player = this.get(playerId);
    if (!step || !player) return null;
    if (step.fake || !player.alive || !step.actorIds.includes(player.id)) return 'Non è il tuo turno.';
    if (step.decided || STEP_KIND[step.id] === 'info') return null;

    const targets = this.targetsFor(step.id, player.id);
    if (targetId !== null && !targets.includes(targetId)) return 'Scelta non valida.';

    if (step.id === 'lupi') {
      step.picks[player.id] = targetId;
      this.checkPackAgreement(step);
    } else {
      if (targetId === null && !this.canSkip(step.id, targets)) return 'Devi scegliere qualcuno.';
      this.decide(step, targetId);
    }
    this.settle();
    this.changed();
    return null;
  }

  /** A role confirms it has read what the night told it. */
  nightAck(playerId: string, stepId: NightStepId): void {
    const step = this.currentStep(stepId);
    if (!step || step.fake || !step.actorIds.includes(playerId) || step.acks.includes(playerId)) return;
    if (STEP_KIND[step.id] !== 'info' && !step.decided) return;
    step.acks.push(playerId);
    this.settle();
    this.changed();
  }

  /** Human narrator: records the choice a role made by pointing at someone. */
  narratorAct(playerId: string, stepId: NightStepId, targetId: string | null): string | null {
    if (playerId !== this.narratorId) return 'Solo il narratore può farlo.';
    const step = this.currentStep(stepId);
    if (!step || step.fake || step.decided || STEP_KIND[step.id] === 'info') return null;
    const actorId = step.id === 'lupi' ? null : step.actorIds[0];
    if (targetId !== null && !this.targetsFor(step.id, actorId).includes(targetId)) return 'Scelta non valida.';
    this.decide(step, targetId);
    this.changed();
    return null;
  }

  /** Human narrator: calls the next role, or ends the night after the last one. */
  narratorNext(playerId: string, stepId: NightStepId): string | null {
    if (playerId !== this.narratorId) return 'Solo il narratore può farlo.';
    if (!this.currentStep(stepId)) return null;
    this.advanceStep();
    return null;
  }

  private advanceStep(): void {
    const night = this.night;
    if (this.phase !== 'night' || !night) return;
    this.clearTimer();
    const step = night.step;
    if (STEP_KIND[step.id] !== 'info') {
      night.actions[step.id] = step.decided ? step.targetId : null;
    }
    this.say(STEP_CLOSE[step.id], 'night', 'close');
    if (night.index + 1 < night.steps.length) this.startStep(night.index + 1);
    else this.resolveNight();
    this.changed();
  }

  /** Label used in the secret journal: "Anna (Veggente)". */
  private tag(player: Player): string {
    return `${player.name} (${ROLES[player.role ?? 'villico'].name})`;
  }

  /**
   * Applies everything the roles chose during the night. All the choices are simultaneous:
   * a role that dies tonight has still acted.
   */
  private resolveNight(): void {
    const night = this.night!;
    const a = night.actions;
    const note = (text: string) => this.journal.push({ round: this.round, text });
    const deaths: Player[] = [];
    const kill = (player: Player) => {
      if (player.alive && !deaths.includes(player)) deaths.push(player);
    };
    const livingWith = (role: RoleId) => this.alive.find((p) => p.role === role);

    const prostitute = livingWith('prostituta');
    const host = prostitute ? this.get(a.prostituta) : undefined; // whose house she is in
    const guarded = livingWith('guardia') ? this.get(a.guardia) : undefined;
    if (guarded) note(`La Guardia ha vegliato su ${this.tag(guarded)}.`);
    if (prostitute && host) note(`${this.tag(prostitute)} ha passato la notte a casa di ${this.tag(host)}.`);

    // 1. The wolves' attack.
    const victim = this.get(a.lupi);
    if (!victim) {
      if (this.alive.some((p) => p.role === 'lupo')) note('I lupi non hanno sbranato nessuno.');
    } else if (!victim.alive) {
      note(`I lupi hanno scelto ${this.tag(victim)}, che però aveva già lasciato il villaggio.`);
    } else if (victim.role === 'criceto') {
      note(`I lupi hanno attaccato ${this.tag(victim)}, ma il Criceto Mannaro non può essere sbranato.`);
    } else if (victim === guarded) {
      note(`I lupi hanno attaccato ${this.tag(victim)}, ma la Guardia vegliava su quella casa.`);
    } else if (victim === prostitute && host) {
      note(`I lupi sono andati a casa di ${this.tag(victim)}, ma era fuori a lavorare.`);
    } else {
      kill(victim);
      note(`I lupi hanno sbranato ${this.tag(victim)}.`);
      if (prostitute && host === victim) {
        kill(prostitute);
        note(`${this.tag(prostitute)} era in quella casa: i lupi hanno sbranato anche lei.`);
      }
    }

    // 2. The Prostituta's visit.
    if (prostitute && host && (host.role === 'lupo' || host.role === 'criceto')) {
      kill(prostitute);
      note(`${this.tag(prostitute)} è andata a casa di ${this.tag(host)}: non è sopravvissuta.`);
    }

    // 3. The Veggente's vision.
    const seen = this.get(a.veggente);
    if (seen) {
      note(`Il Veggente ha scrutato ${this.tag(seen)}.`);
      if (seen.role === 'criceto' && seen.alive) {
        kill(seen);
        note(`${this.tag(seen)} è stato visto dal Veggente: è morto.`);
      }
    }

    // 4. The Cacciatore's shot.
    const shot = this.get(a.cacciatore);
    if (shot) {
      this.hunterUsed = true;
      kill(shot);
      note(`Il Cacciatore ha sparato a ${this.tag(shot)}.`);
    }

    // The Guardia may not protect the same person on two nights in a row.
    this.guardLastProtected = a.guardia ?? null;

    for (const player of deaths) player.alive = false;

    // 5. The Mitomane (first night only) joins the pack if it picked a wolf and lived through the night.
    const copied = this.get(a.mitomane);
    const mythomaniac = livingWith('mitomane');
    if (copied) {
      const becomesWolf = copied.role === 'lupo';
      if (!mythomaniac) note(`Il Mitomane aveva scelto ${this.tag(copied)}, ma non ha superato la notte.`);
      else if (!becomesWolf) note(`Il Mitomane ha scelto ${this.tag(copied)}: resta un semplice villico.`);
      else {
        note(`Il Mitomane (${mythomaniac.name}) ha scelto ${this.tag(copied)}: ora è un lupo mannaro.`);
        for (const wolf of this.seats.filter((p) => p.role === 'lupo')) {
          wolf.notes.push({ round: this.round, text: `${mythomaniac.name}, il Mitomane, si è unito al branco.` });
        }
        mythomaniac.role = 'lupo';
        mythomaniac.notes.push({ round: this.round, text: 'All’alba ti sei unito al branco: ora sei un lupo mannaro.' });
      }
    }

    // Deaths are announced in seat order, so the order says nothing about the cause.
    const dead = this.seats.filter((p) => deaths.includes(p));
    this.nightDeaths = dead.map((p) => p.id);
    this.night = null;
    this.phase = 'dawn';
    const names = listNames(dead.map((p) => p.name));
    this.say(
      dead.length === 0
        ? 'Sorge il sole su Tabula. Incredibilmente, questa notte non è morto nessuno.'
        : dead.length === 1
          ? `Sorge il sole su Tabula. Questa notte ${names} ha perso la vita.`
          : `Sorge il sole su Tabula. Questa notte ${names} hanno perso la vita.`,
      'day',
      'dawn', // the recorded voice only says that a new day has come: who died is read on the screen
    );
    this.checkWin();
  }

  // ───────────────────────── Day ─────────────────────────

  private openVote(): void {
    const alive = this.alive.map((p) => p.id);
    this.phase = 'voting';
    this.discussionEndsAt = null;
    this.lastVote = null;
    this.vote = { round: 1, candidates: alive, voters: [...alive], ballots: {} };
    this.say(
      this.settings.secretVote
        ? 'È il momento del giudizio. Votazione segreta: ognuno tocchi chi vuole lapidare.'
        : 'È il momento del giudizio. Ognuno tocchi chi vuole lapidare: i voti sono palesi.',
      'discussion',
    );
  }

  castVote(playerId: string, targetId: string | null): string | null {
    const v = this.vote;
    if (this.phase !== 'voting' || !v) return null;
    if (!v.voters.includes(playerId)) return 'Non puoi votare in questa votazione.';
    if (targetId === null) {
      delete v.ballots[playerId];
    } else {
      if (targetId === playerId || !v.candidates.includes(targetId)) return 'Voto non valido.';
      v.ballots[playerId] = targetId;
    }
    this.changed();
    return null;
  }

  private closeVote(): void {
    const v = this.vote;
    if (!v) return;
    const tally: Record<string, number> = {};
    for (const id of v.candidates) tally[id] = 0;
    for (const target of Object.values(v.ballots)) tally[target] += 1;
    const best = Math.max(0, ...Object.values(tally));
    const top = best > 0 ? v.candidates.filter((id) => tally[id] === best) : [];
    const ballots = this.settings.secretVote ? null : { ...v.ballots };
    const nameOf = (id: string) => this.get(id)?.name ?? '?';

    if (top.length > 1 && v.round === 1) {
      const voters = this.alive.map((p) => p.id).filter((id) => !top.includes(id));
      if (voters.length > 0) {
        this.lastVote = { round: 1, tally, ballots, lynchedId: null, tied: top };
        this.vote = { round: 2, candidates: top, voters, ballots: {} };
        this.say(
          `Parità tra ${listNames(top.map(nameOf))}! Si va al ballottaggio: gli indiziati non votano.`,
          'discussion',
        );
        return;
      }
    }

    const lynched = top.length === 1 ? this.get(top[0]) : undefined;
    this.lastVote = { round: v.round, tally, ballots, lynchedId: lynched?.id ?? null, tied: top.length > 1 ? top : [] };
    this.vote = null;
    this.phase = 'verdict';

    if (lynched) {
      this.lastLynch = { name: lynched.name, wasWolf: lynched.role === 'lupo' };
      this.journal.push({ round: this.round, text: `Il villaggio ha lapidato ${this.tag(lynched)}.` });
      lynched.alive = false;
      this.say(`Il villaggio ha deciso di lapidare ${lynched.name}.`, 'day');
    } else {
      this.lastLynch = null;
      this.journal.push({ round: this.round, text: 'Il villaggio non ha lapidato nessuno.' });
      this.say(
        top.length > 1
          ? 'Ancora parità: il villaggio non trova un accordo e oggi nessuno viene lapidato.'
          : 'Nessun voto: oggi il villaggio non lapida nessuno.',
        'day',
      );
    }
    this.checkWin();
  }

  // ───────────────────────── End of the game ─────────────────────────

  /**
   * Humans win when no wolf is left; wolves win as soon as they are as many as everyone else.
   * A Criceto Mannaro still alive at that point steals the victory.
   */
  private checkWin(): boolean {
    if (this.phase === 'lobby' || this.phase === 'ended') return this.phase === 'ended';
    const alive = this.alive;
    const wolves = alive.filter((p) => p.role === 'lupo').length;
    const others = alive.length - wolves;

    let winner: Faction;
    if (wolves === 0) winner = 'villaggio';
    else if (wolves >= others) winner = 'lupi';
    else return false;

    if (alive.some((p) => p.role === 'criceto')) {
      this.endReason = 'La partita è finita e il Criceto Mannaro è ancora vivo: vince da solo!';
      winner = 'criceto';
    } else if (winner === 'villaggio') {
      this.endReason = 'Tutti i lupi mannari sono stati eliminati: il villaggio è salvo!';
    } else {
      this.endReason = 'I lupi mannari sono ormai tanti quanti gli altri abitanti: il villaggio è perduto!';
    }

    this.clearTimer();
    this.winner = winner;
    this.phase = 'ended';
    this.night = null;
    this.vote = null;
    this.discussionEndsAt = null;
    this.say(this.endReason, 'day');
    return true;
  }

  private gameOver(): GameOverView | null {
    if (this.phase !== 'ended' || !this.winner) return null;
    const winner = this.winner;
    const factionOf = (role: RoleId): Faction => (role === 'lupo' ? 'lupi' : role === 'criceto' ? 'criceto' : 'villaggio');
    return {
      winner,
      reason: this.endReason,
      players: this.seats.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role!,
        originalRole: p.originalRole!,
        alive: p.alive,
        won: factionOf(p.role!) === winner,
      })),
      journal: this.journal,
    };
  }

  // ───────────────────────── Views ─────────────────────────

  private actionFor(player: Player): NightAction | null {
    const step = this.night?.step;
    if (this.phase !== 'night' || !step || step.fake || !player.alive || !step.actorIds.includes(player.id)) {
      return null;
    }
    const kind = STEP_KIND[step.id];
    const targets = step.decided ? [] : this.targetsFor(step.id, player.id);
    const text = STEP_PROMPT[step.id];
    const hasResult = kind === 'info' || step.decided;
    return {
      step: step.id,
      kind,
      prompt: text.prompt,
      verb: text.verb,
      targets,
      canSkip: !step.decided && kind === 'pick' && this.canSkip(step.id, targets),
      skipLabel: text.skip,
      decided: step.decided,
      targetId: step.targetId,
      result: hasResult ? (step.results[player.id] ?? null) : null,
      needsAck: this.auto && hasResult && NEEDS_ACK.has(step.id) && !step.acks.includes(player.id),
      packPicks: kind === 'wolves' ? Object.fromEntries(step.actorIds.map((id) => [id, step.picks[id] ?? null])) : null,
      deadline: step.deadline,
    };
  }

  private narratorStep(): NarratorStepView | null {
    const night = this.night;
    if (this.phase !== 'night' || !night) return null;
    const step = night.step;
    const kind = STEP_KIND[step.id];
    const actorId = step.id === 'lupi' ? null : (step.actorIds[0] ?? null);
    const targets = step.fake || step.decided || kind === 'info' ? [] : this.targetsFor(step.id, actorId);

    let hint: string | null;
    if (step.fake) {
      hint = 'Nessuno può giocare questo ruolo: chiamalo comunque ad alta voce, attendi qualche secondo e prosegui.';
    } else if (kind === 'info' || step.decided) {
      // What the role reads on its own phone, so the narrator can also say or signal it.
      const told = step.results[step.actorIds[0]];
      hint = told ? `Il ruolo legge: «${told}»` : null;
      if (step.id === 'massoni') hint = 'I massoni si guardano e si riconoscono. Lascia loro qualche secondo.';
    } else {
      hint = 'Chi gioca il ruolo può indicare qualcuno a gesti, oppure scegliere dal proprio telefono.';
    }

    return {
      id: step.id,
      title: STEP_TITLE[step.id],
      actorIds: step.actorIds,
      fake: step.fake,
      kind,
      targets,
      canSkip: !step.fake && !step.decided && kind !== 'info',
      decided: step.decided,
      targetId: step.targetId,
      hint,
      packPicks: kind === 'wolves' ? Object.fromEntries(step.actorIds.map((id) => [id, step.picks[id] ?? null])) : null,
      isLast: night.index === night.steps.length - 1,
    };
  }

  viewFor(player: Player): GameView {
    const inLobby = this.phase === 'lobby';
    const host = this.host;
    const isNarrator = !inLobby && player.id === this.narratorId;
    const v = this.vote;
    const step = this.night?.step;
    const role = player.role;

    return {
      roomCode: this.code,
      now: Date.now(),
      youId: player.id,
      phase: this.phase,
      settings: this.settings,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        connected: p.socketId !== null,
        inGame: inLobby || p.role !== null,
        alive: p.alive,
        left: p.left,
        seenCard: p.seenCard,
      })),
      hostId: host?.id ?? '',
      hostOfflineSince: host && !host.socketId ? host.offlineSince : null,
      hostClaimAfter: this.timing.hostClaimAfter,
      narratorId: inLobby ? null : this.narratorId,
      round: this.round,
      deck: this.deck,
      narration: this.log,
      nightStep: this.phase === 'night' && step ? { id: step.id, title: STEP_TITLE[step.id] } : null,
      nightDeaths: this.nightDeaths,
      discussionEndsAt: this.discussionEndsAt,
      vote: v
        ? {
            round: v.round,
            secret: this.settings.secretVote,
            candidates: v.candidates,
            voters: v.voters,
            voted: Object.keys(v.ballots),
            ballots: this.settings.secretVote ? null : v.ballots,
            myVote: v.ballots[player.id] ?? null,
          }
        : null,
      lastVote: this.lastVote,
      me:
        role && !inLobby
          ? {
              role,
              originalRole: player.originalRole ?? role,
              faction: role === 'lupo' ? 'lupi' : role === 'criceto' ? 'criceto' : 'villaggio',
              packIds: role === 'lupo' ? this.seats.filter((p) => p.role === 'lupo' && p !== player).map((p) => p.id) : [],
              masonId:
                role === 'massone' && this.masonsMet
                  ? (this.seats.find((p) => p.originalRole === 'massone' && p !== player)?.id ?? null)
                  : null,
              notes: player.notes,
              action: this.actionFor(player),
            }
          : null,
      narratorView: isNarrator
        ? {
            roles: Object.fromEntries(this.seats.map((p) => [p.id, { role: p.role!, originalRole: p.originalRole! }])),
            step: this.narratorStep(),
            journal: this.journal,
          }
        : null,
      gameOver: this.gameOver(),
    };
  }

  // ───────────────────────── Helpers ─────────────────────────

  private say(text: string, scene: NarrationEntry['scene'], cue: NarrationCue | null = null): void {
    this.log.push({ id: ++this.logSeq, text, cue, scene, round: this.round });
    if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT);
  }

  private schedule(ms: number, fn: () => void): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      fn();
    }, Math.max(0, ms));
    this.timer.unref(); // a pending night step must not keep the process alive
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private changed(): void {
    this.hooks.onChange();
  }
}
