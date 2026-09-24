export type Team = 'liberal' | 'fascist';

export type Role = 'liberal' | 'fascist' | 'hitler';

export type PolicyType = 'liberal' | 'fascist';

export type GamePhase =
  | 'chancellor-nomination'
  | 'election'
  | 'legislative-president'
  | 'legislative-chancellor'
  | 'veto-requested'
  | 'policy-enacted'
  | 'executive-action'
  | 'game-over';

export type ExecutiveAction =
  | 'none'
  | 'investigate-loyalty'
  | 'special-election'
  | 'policy-peek'
  | 'execution';

export type Vote = 'ja' | 'nein';

export type WinCondition =
  | 'liberal-policies'
  | 'fascist-policies'
  | 'hitler-assassinated'
  | 'hitler-chancellor';

export type VetoResponse = 'accept' | 'reject';

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  role: Role;
  team: Team;
}

export interface DossierRevealPayload {
  you: {
    name: string;
    role: Role;
    team: Team;
  };
  knownFascists: string[];
  knownHitler: string | null;
}

export interface BoardPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  isPresident: boolean;
  isChancellor: boolean;
  isPreviousPresident: boolean;
  isPreviousChancellor: boolean;
  isTermLimited: boolean;
  hasBeenInvestigated: boolean;
}

export interface GameBoardState {
  phase: GamePhase;
  players: BoardPlayer[];
  playerCount: number;
  liberalPolicies: number;
  fascistPolicies: number;
  electionTracker: number;
  drawPileCount: number;
  discardPileCount: number;
  presidentId: string;
  chancellorCandidateId: string | null;
  chancellorId: string | null;
  vetoUnlocked: boolean;
  lastEnactedPolicy: PolicyType | null;
  executiveAction: ExecutiveAction | null;
  /** Ids of players who have already voted in the current election (votes stay secret). */
  votedPlayerIds: string[];
  /** Votes of the most recent election, public until the next chancellor nomination. */
  lastVotes: Record<string, Vote> | null;
}

export interface ElectionResult {
  votes: Record<string, Vote>;
  passed: boolean;
  chancellorId: string;
}

export interface PresidentLegislativePayload {
  drawnPolicies: [PolicyType, PolicyType, PolicyType];
}

export interface ChancellorLegislativePayload {
  receivedPolicies: [PolicyType, PolicyType];
  canVeto: boolean;
}

export interface PolicyPeekPayload {
  topPolicies: [PolicyType, PolicyType, PolicyType];
}

export interface InvestigationPayload {
  targetId: string;
  targetName: string;
  team: Team;
}

export interface GameOverPayload {
  winningTeam: Team;
  winCondition: WinCondition;
  players: Array<{ id: string; name: string; role: Role; team: Team; isAlive: boolean }>;
}
