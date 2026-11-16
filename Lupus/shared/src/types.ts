import type { Faction, RoleCounts, RoleId } from './roles.js';

export type NarratorMode = 'auto' | 'human';

/** Which phones read the night aloud: none, only the one driving the game, or everyone's. */
export type AudioMode = 'off' | 'master' | 'all';

export interface Settings {
  /** 'auto': the app narrates and every player has a card. 'human': the host narrates and sees every role. */
  narrator: NarratorMode;
  /** Human narrator only: who narrates. null = the host. */
  narratorId: string | null;
  audio: AudioMode;
  secretVote: boolean;
  /** Length of the discussion countdown in seconds; 0 disables it. */
  discussionSeconds: number;
  /** When true the deck follows the recommended setup for the current number of players. */
  autoRoles: boolean;
  roles: RoleCounts;
}

export type SettingsPatch = Partial<Omit<Settings, 'roles'>> & { roles?: Partial<RoleCounts> };

export type Phase = 'lobby' | 'setup' | 'night' | 'dawn' | 'discussion' | 'voting' | 'verdict' | 'ended';

export type NightStepId =
  | 'massoni'
  | 'medium'
  | 'prostituta'
  | 'guardia'
  | 'veggente'
  | 'lupi'
  | 'cacciatore'
  | 'mitomane';

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  /** False for the human narrator, who sits outside the circle. */
  inGame: boolean;
  alive: boolean;
  /** The player walked away (or was removed) during the game. */
  left: boolean;
  /** Setup phase: the player has looked at their card. */
  seenCard: boolean;
}

/**
 * The recorded line of the narrator that goes with a narration entry, when the voice is on:
 * nightfall, a role opening its eyes, "close your eyes", daybreak.
 */
export type NarrationCue = 'night' | 'close' | 'dawn' | NightStepId;

export interface NarrationEntry {
  id: number;
  text: string;
  cue: NarrationCue | null;
  scene: 'night' | 'day' | 'discussion';
  /** Night/day number the line belongs to (0 before the first night). */
  round: number;
}

export interface Note {
  round: number;
  text: string;
}

/** What a player has to do during the current night step. */
export interface NightAction {
  step: NightStepId;
  /** 'info': just read and confirm. 'pick': choose a target. 'wolves': the pack must agree on a target. */
  kind: 'info' | 'pick' | 'wolves';
  prompt: string;
  /** Verb shown on the confirm button, e.g. "Scruta". */
  verb: string;
  targets: string[];
  canSkip: boolean;
  skipLabel: string;
  /** The choice is locked in. */
  decided: boolean;
  targetId: string | null;
  /** Text shown once the choice is locked (or straight away for 'info' steps). */
  result: string | null;
  /** The player still has to press "Ok" after reading `result`. */
  needsAck: boolean;
  /** Wolves only: what each member of the pack currently wants. */
  packPicks: Record<string, string | null> | null;
  /** Server timestamp (ms) at which the step is skipped automatically; null with a human narrator. */
  deadline: number | null;
}

export interface PrivateView {
  role: RoleId;
  /** Card originally dealt (differs from `role` for a Mitomane who joined the pack). */
  originalRole: RoleId;
  faction: Faction;
  /** Wolves: the other members of the pack. */
  packIds: string[];
  /** Massoni: the other mason, known after the first night. */
  masonId: string | null;
  notes: Note[];
  action: NightAction | null;
}

export interface NarratorStepView {
  id: NightStepId;
  title: string;
  actorIds: string[];
  /** Nobody can act (role dead, shot already fired...): the narrator only pretends to call the role. */
  fake: boolean;
  kind: 'info' | 'pick' | 'wolves';
  targets: string[];
  canSkip: boolean;
  decided: boolean;
  targetId: string | null;
  /** What to tell or signal to the role. */
  hint: string | null;
  packPicks: Record<string, string | null> | null;
  isLast: boolean;
}

export interface NarratorView {
  roles: Record<string, { role: RoleId; originalRole: RoleId }>;
  step: NarratorStepView | null;
  /** Private journal with the full detail of what happened each night. */
  journal: Note[];
}

export interface VoteView {
  round: 1 | 2;
  secret: boolean;
  candidates: string[];
  voters: string[];
  /** Who has already voted (always public). */
  voted: string[];
  /** voter -> target; null while a secret vote is in progress. */
  ballots: Record<string, string> | null;
  myVote: string | null;
}

export interface VoteResult {
  round: 1 | 2;
  tally: Record<string, number>;
  /** voter -> target; null for secret votes. */
  ballots: Record<string, string> | null;
  lynchedId: string | null;
  /** Players tied for first place (empty unless the vote ended in a tie). */
  tied: string[];
}

export interface GameOverView {
  winner: Faction;
  reason: string;
  players: Array<{ id: string; name: string; role: RoleId; originalRole: RoleId; alive: boolean; won: boolean }>;
  /** The secret chronicle of the game, revealed to everyone at the end. */
  journal: Note[];
}

export interface GameView {
  roomCode: string;
  /** Server clock (ms) when the view was built, to sync countdowns. */
  now: number;
  youId: string;
  phase: Phase;
  settings: Settings;
  players: PublicPlayer[];
  hostId: string;
  /** Since when the host has been offline (ms), or null. Lets the others take over. */
  hostOfflineSince: number | null;
  /** Milliseconds the host must be offline before someone else may take over. */
  hostClaimAfter: number;
  /** Human narrator of the current game, if any. */
  narratorId: string | null;
  /** Night/day number, 0 before the first night. */
  round: number;
  /** Cards dealt this game (Villici included). */
  deck: Record<RoleId, number> | null;
  narration: NarrationEntry[];
  /** Night only: the role currently being called. */
  nightStep: { id: NightStepId; title: string } | null;
  /** Dawn only: who was found dead. */
  nightDeaths: string[];
  discussionEndsAt: number | null;
  vote: VoteView | null;
  lastVote: VoteResult | null;
  /** The player's own card; null in the lobby and for the human narrator. */
  me: PrivateView | null;
  narratorView: NarratorView | null;
  gameOver: GameOverView | null;
}

export interface SessionInfo {
  roomCode: string;
  token: string;
}

export type Ack<T = object> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServerEvents {
  'room:create': (data: { name: string }, ack: Ack<{ session: SessionInfo }>) => void;
  'room:join': (data: { name: string; roomCode: string }, ack: Ack<{ session: SessionInfo }>) => void;
  /** `fromBackup`: the session came from long-term storage, so it must not steal a seat that is in use. */
  'room:resume': (data: SessionInfo & { fromBackup: boolean }, ack: Ack) => void;
  'room:leave': () => void;
  'host:claim': () => void;
  'host:kick': (data: { playerId: string }) => void;
  'lobby:settings': (data: SettingsPatch) => void;
  'lobby:start': () => void;
  'game:seen-card': () => void;
  /** Host/narrator moves the game forward. `from` is the phase the button was pressed in (stale taps are ignored). */
  'game:advance': (data: { from: Phase }) => void;
  'game:abort': () => void;
  'night:act': (data: { step: NightStepId; targetId: string | null }) => void;
  'night:ack': (data: { step: NightStepId }) => void;
  /** Human narrator: record the choice a role made by pointing. */
  'narrator:act': (data: { step: NightStepId; targetId: string | null }) => void;
  /** Human narrator: call the next role (or end the night). */
  'narrator:next': (data: { step: NightStepId }) => void;
  'vote:cast': (data: { targetId: string | null }) => void;
}

export interface ServerToClientEvents {
  state: (view: GameView) => void;
  notice: (data: { message: string }) => void;
  /** The seat was removed or taken over from another tab/device. */
  'session:ended': (data: { reason: 'replaced' | 'removed' | 'closed'; message: string }) => void;
}
