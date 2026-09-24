import type {
  PolicyType,
  GamePhase,
  ExecutiveAction,
  Vote,
  VetoResponse,
  BoardPlayer,
  GameBoardState,
  ElectionResult,
  Team,
  Role,
  WinCondition,
  GameOverPayload,
} from 'shared';
import {
  LIBERAL_POLICIES_IN_DECK,
  FASCIST_POLICIES_IN_DECK,
  LIBERAL_POLICIES_TO_WIN,
  FASCIST_POLICIES_TO_WIN,
  ELECTION_TRACKER_THRESHOLD,
  FASCIST_POLICIES_FOR_HITLER_WIN,
  VETO_UNLOCK_FASCIST_POLICIES,
  EXECUTIVE_ACTIONS,
  getExecutiveActionTier,
} from 'shared';

interface PlayerInfo {
  id: string;
  name: string;
  role: Role;
  team: Team;
  isAlive: boolean;
  hasBeenInvestigated: boolean;
}

export class GameEngine {
  private playerOrder: string[];
  private playerInfo: Map<string, PlayerInfo>;
  private presidentIndex: number;
  private presidentId: string;
  private chancellorCandidateId: string | null = null;
  private chancellorId: string | null = null;
  private previousPresidentId: string | null = null;
  private previousChancellorId: string | null = null;
  private phase: GamePhase = 'chancellor-nomination';
  private drawPile: PolicyType[] = [];
  private discardPile: PolicyType[] = [];
  private liberalPolicies = 0;
  private fascistPolicies = 0;
  private electionTracker = 0;
  private votes: Map<string, Vote> = new Map();
  private lastVotes: Record<string, Vote> | null = null;
  private drawnPolicies: PolicyType[] = [];
  private chancellorPolicies: PolicyType[] = [];
  private executiveActionTier: string;
  private specialElectionReturnIndex: number | null = null;
  private gameOver = false;
  private winCondition: WinCondition | null = null;
  private winningTeam: Team | null = null;

  constructor(
    players: Array<{ id: string; name: string; role: Role; team: Team }>
  ) {
    this.playerOrder = players.map((p) => p.id);
    this.playerInfo = new Map(
      players.map((p) => [
        p.id,
        { ...p, isAlive: true, hasBeenInvestigated: false },
      ])
    );
    this.executiveActionTier = getExecutiveActionTier(players.length);

    // Shuffle player order for president rotation
    this.shuffleArray(this.playerOrder);

    // Build deck
    this.buildDeck();

    // First president
    this.presidentIndex = 0;
    this.presidentId = this.playerOrder[0];
  }

  // --- Deck management ---

  private buildDeck(): void {
    this.drawPile = [];
    for (let i = 0; i < LIBERAL_POLICIES_IN_DECK; i++) this.drawPile.push('liberal');
    for (let i = 0; i < FASCIST_POLICIES_IN_DECK; i++) this.drawPile.push('fascist');
    this.shuffleArray(this.drawPile);
    this.discardPile = [];
  }

  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private reshuffleDeckIfNeeded(): void {
    if (this.drawPile.length < 3) {
      this.drawPile.push(...this.discardPile);
      this.discardPile = [];
      this.shuffleArray(this.drawPile);
    }
  }

  // --- Eligibility ---

  getEligibleChancellorCandidates(): string[] {
    const alivePlayers = this.playerOrder.filter(
      (id) => this.playerInfo.get(id)!.isAlive && id !== this.presidentId
    );
    const aliveCount = this.playerOrder.filter(
      (id) => this.playerInfo.get(id)!.isAlive
    ).length;

    return alivePlayers.filter((id) => {
      // Previous chancellor is always term-limited
      if (id === this.previousChancellorId) return false;
      // Previous president is term-limited only if >5 alive players
      if (aliveCount > 5 && id === this.previousPresidentId) return false;
      return true;
    });
  }

  // --- Nomination ---

  nominateChancellor(presidentId: string, targetId: string): boolean {
    if (this.phase !== 'chancellor-nomination') return false;
    if (presidentId !== this.presidentId) return false;
    if (!this.getEligibleChancellorCandidates().includes(targetId)) return false;

    this.chancellorCandidateId = targetId;
    this.votes.clear();
    this.lastVotes = null;
    this.phase = 'election';
    return true;
  }

  // --- Voting ---

  castVote(playerId: string, vote: Vote): { accepted: boolean; allVoted: boolean } {
    const player = this.playerInfo.get(playerId);
    if (!player || !player.isAlive) return { accepted: false, allVoted: false };
    if (this.phase !== 'election') return { accepted: false, allVoted: false };

    this.votes.set(playerId, vote);

    const aliveCount = this.getAlivePlayers().length;
    return { accepted: true, allVoted: this.votes.size >= aliveCount };
  }

  resolveElection(): ElectionResult & { hitlerChancellor?: boolean } {
    const votesObj: Record<string, Vote> = {};
    this.votes.forEach((v, k) => (votesObj[k] = v));
    this.lastVotes = votesObj;

    let jaCount = 0;
    let neinCount = 0;
    this.votes.forEach((v) => {
      if (v === 'ja') jaCount++;
      else neinCount++;
    });

    const passed = jaCount > neinCount;

    const result: ElectionResult & { hitlerChancellor?: boolean } = {
      votes: votesObj,
      passed,
      chancellorId: this.chancellorCandidateId!,
    };

    if (passed) {
      this.chancellorId = this.chancellorCandidateId;
      this.electionTracker = 0;

      // Check Hitler-as-chancellor win
      if (this.fascistPolicies >= FASCIST_POLICIES_FOR_HITLER_WIN) {
        const chancellor = this.playerInfo.get(this.chancellorId!);
        if (chancellor && chancellor.role === 'hitler') {
          this.gameOver = true;
          this.winCondition = 'hitler-chancellor';
          this.winningTeam = 'fascist';
          this.phase = 'game-over';
          result.hitlerChancellor = true;
          return result;
        }
      }

      this.phase = 'legislative-president';
    } else {
      this.chancellorCandidateId = null;
      this.electionTracker++;
    }

    return result;
  }

  // --- Chaos (election tracker hit 3) ---

  checkChaos(): { chaos: boolean; policy?: PolicyType; slot?: number } {
    if (this.electionTracker < ELECTION_TRACKER_THRESHOLD) return { chaos: false };

    this.electionTracker = 0;
    this.previousPresidentId = null;
    this.previousChancellorId = null;

    this.reshuffleDeckIfNeeded();
    const policy = this.drawPile.pop()!;

    if (policy === 'liberal') {
      this.liberalPolicies++;
      const slot = this.liberalPolicies;
      if (this.liberalPolicies >= LIBERAL_POLICIES_TO_WIN) {
        this.gameOver = true;
        this.winCondition = 'liberal-policies';
        this.winningTeam = 'liberal';
        this.phase = 'game-over';
      }
      return { chaos: true, policy, slot };
    } else {
      this.fascistPolicies++;
      const slot = this.fascistPolicies;
      if (this.fascistPolicies >= FASCIST_POLICIES_TO_WIN) {
        this.gameOver = true;
        this.winCondition = 'fascist-policies';
        this.winningTeam = 'fascist';
        this.phase = 'game-over';
      }
      return { chaos: true, policy, slot };
    }
  }

  // --- Legislative session ---

  presidentDrawPolicies(): PolicyType[] {
    this.reshuffleDeckIfNeeded();
    this.drawnPolicies = [
      this.drawPile.pop()!,
      this.drawPile.pop()!,
      this.drawPile.pop()!,
    ];
    return [...this.drawnPolicies];
  }

  presidentDiscard(index: number): PolicyType[] | null {
    if (this.phase !== 'legislative-president') return null;
    if (index < 0 || index > 2) return null;

    const discarded = this.drawnPolicies.splice(index, 1)[0];
    this.discardPile.push(discarded);
    this.chancellorPolicies = [...this.drawnPolicies];
    this.drawnPolicies = [];
    this.phase = 'legislative-chancellor';
    return [...this.chancellorPolicies];
  }

  chancellorEnact(
    index: number
  ): {
    enacted: PolicyType;
    slot: number;
    executiveAction: ExecutiveAction;
  } | null {
    if (this.phase !== 'legislative-chancellor') return null;
    if (index < 0 || index > 1) return null;

    const enacted = this.chancellorPolicies[index];
    const discarded = this.chancellorPolicies[1 - index];
    this.discardPile.push(discarded);
    this.chancellorPolicies = [];

    return this.enactPolicy(enacted);
  }

  private enactPolicy(policy: PolicyType): {
    enacted: PolicyType;
    slot: number;
    executiveAction: ExecutiveAction;
  } {
    let slot: number;
    let executiveAction: ExecutiveAction = 'none';

    if (policy === 'liberal') {
      this.liberalPolicies++;
      slot = this.liberalPolicies;
      if (this.liberalPolicies >= LIBERAL_POLICIES_TO_WIN) {
        this.gameOver = true;
        this.winCondition = 'liberal-policies';
        this.winningTeam = 'liberal';
        this.phase = 'game-over';
        return { enacted: policy, slot, executiveAction };
      }
    } else {
      this.fascistPolicies++;
      slot = this.fascistPolicies;
      if (this.fascistPolicies >= FASCIST_POLICIES_TO_WIN) {
        this.gameOver = true;
        this.winCondition = 'fascist-policies';
        this.winningTeam = 'fascist';
        this.phase = 'game-over';
        return { enacted: policy, slot, executiveAction };
      }
      // Determine executive action (0-indexed: fascistPolicies-1)
      const actions = EXECUTIVE_ACTIONS[this.executiveActionTier];
      executiveAction = actions[this.fascistPolicies - 1];
    }

    if (executiveAction !== 'none') {
      this.phase = 'executive-action';
    } else {
      this.phase = 'policy-enacted';
    }

    return { enacted: policy, slot, executiveAction };
  }

  // --- Veto ---

  get vetoUnlocked(): boolean {
    return this.fascistPolicies >= VETO_UNLOCK_FASCIST_POLICIES;
  }

  chancellorRequestVeto(): boolean {
    if (this.phase !== 'legislative-chancellor') return false;
    if (!this.vetoUnlocked) return false;
    this.phase = 'veto-requested';
    return true;
  }

  presidentRespondToVeto(
    response: VetoResponse
  ): { accepted: boolean; chaos?: boolean; chaosPolicy?: PolicyType; chaosSlot?: number } {
    if (this.phase !== 'veto-requested') return { accepted: false };

    if (response === 'reject') {
      this.phase = 'legislative-chancellor';
      return { accepted: false };
    }

    // Veto accepted: discard both policies, advance tracker
    this.discardPile.push(...this.chancellorPolicies);
    this.chancellorPolicies = [];
    this.electionTracker++;

    const chaosResult = this.checkChaos();
    if (chaosResult.chaos) {
      return {
        accepted: true,
        chaos: true,
        chaosPolicy: chaosResult.policy,
        chaosSlot: chaosResult.slot,
      };
    }

    // No chaos, advance to next round
    return { accepted: true };
  }

  // --- Executive actions ---

  investigatePlayer(
    presidentId: string,
    targetId: string
  ): { targetName: string; team: Team } | null {
    if (this.phase !== 'executive-action') return null;
    if (presidentId !== this.presidentId) return null;
    const target = this.playerInfo.get(targetId);
    if (!target || !target.isAlive || target.hasBeenInvestigated) return null;
    if (targetId === presidentId) return null;

    target.hasBeenInvestigated = true;
    return { targetName: target.name, team: target.team };
  }

  callSpecialElection(presidentId: string, targetId: string): boolean {
    if (this.phase !== 'executive-action') return false;
    if (presidentId !== this.presidentId) return false;
    const target = this.playerInfo.get(targetId);
    if (!target || !target.isAlive || targetId === presidentId) return false;

    // Save where to return after the special election
    this.specialElectionReturnIndex = this.presidentIndex;

    // Set the special-elected president
    this.previousPresidentId = this.presidentId;
    this.previousChancellorId = this.chancellorId;
    this.chancellorId = null;
    this.chancellorCandidateId = null;

    this.presidentId = targetId;
    this.phase = 'chancellor-nomination';
    return true;
  }

  executePlayer(
    presidentId: string,
    targetId: string
  ): { hitlerKilled: boolean; targetName: string } | null {
    if (this.phase !== 'executive-action') return null;
    if (presidentId !== this.presidentId) return null;
    const target = this.playerInfo.get(targetId);
    if (!target || !target.isAlive || targetId === presidentId) return null;

    target.isAlive = false;

    if (target.role === 'hitler') {
      this.gameOver = true;
      this.winCondition = 'hitler-assassinated';
      this.winningTeam = 'liberal';
      this.phase = 'game-over';
      return { hitlerKilled: true, targetName: target.name };
    }

    return { hitlerKilled: false, targetName: target.name };
  }

  getPolicyPeek(): PolicyType[] {
    this.reshuffleDeckIfNeeded();
    // Peek at top 3 without removing
    const top = this.drawPile.slice(-3).reverse();
    return top;
  }

  acknowledgePolicyPeek(): void {
    // No state change needed other than advancing
  }

  // --- Round management ---

  advanceToNextRound(): void {
    // Term limits only apply to the last *elected* government: a failed election
    // (no chancellor) leaves the previous term limits in place.
    if (this.chancellorId !== null) {
      this.previousPresidentId = this.presidentId;
      this.previousChancellorId = this.chancellorId;
    }
    this.chancellorId = null;
    this.chancellorCandidateId = null;

    if (this.specialElectionReturnIndex !== null) {
      // Return to normal rotation after special election
      this.presidentIndex = this.specialElectionReturnIndex;
      this.specialElectionReturnIndex = null;
    }

    // Advance to next alive player
    do {
      this.presidentIndex = (this.presidentIndex + 1) % this.playerOrder.length;
    } while (!this.playerInfo.get(this.playerOrder[this.presidentIndex])!.isAlive);

    this.presidentId = this.playerOrder[this.presidentIndex];
    this.phase = 'chancellor-nomination';
  }

  // --- State getters ---

  getAlivePlayers(): PlayerInfo[] {
    return this.playerOrder
      .map((id) => this.playerInfo.get(id)!)
      .filter((p) => p.isAlive);
  }

  getPublicState(): GameBoardState {
    const aliveCount = this.getAlivePlayers().length;
    const players: BoardPlayer[] = this.playerOrder.map((id) => {
      const p = this.playerInfo.get(id)!;
      const isTermLimited =
        p.isAlive &&
        id !== this.presidentId &&
        (id === this.previousChancellorId ||
          (aliveCount > 5 && id === this.previousPresidentId));

      return {
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        isPresident: id === this.presidentId,
        isChancellor: id === this.chancellorId,
        isPreviousPresident: id === this.previousPresidentId,
        isPreviousChancellor: id === this.previousChancellorId,
        isTermLimited,
        hasBeenInvestigated: p.hasBeenInvestigated,
      };
    });

    const currentAction = this.getCurrentExecutiveAction();

    return {
      phase: this.phase,
      players,
      playerCount: this.playerOrder.length,
      liberalPolicies: this.liberalPolicies,
      fascistPolicies: this.fascistPolicies,
      electionTracker: this.electionTracker,
      drawPileCount: this.drawPile.length,
      discardPileCount: this.discardPile.length,
      presidentId: this.presidentId,
      chancellorCandidateId: this.chancellorCandidateId,
      chancellorId: this.chancellorId,
      vetoUnlocked: this.vetoUnlocked,
      lastEnactedPolicy: null,
      executiveAction: currentAction,
      votedPlayerIds: this.phase === 'election' ? [...this.votes.keys()] : [],
      lastVotes: this.lastVotes,
    };
  }

  private getCurrentExecutiveAction(): ExecutiveAction | null {
    if (this.phase !== 'executive-action') return null;
    const actions = EXECUTIVE_ACTIONS[this.executiveActionTier];
    return actions[this.fascistPolicies - 1] || null;
  }

  getPresidentId(): string {
    return this.presidentId;
  }

  getChancellorId(): string | null {
    return this.chancellorId;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  getGameOverPayload(): GameOverPayload | null {
    if (!this.gameOver) return null;
    return {
      winningTeam: this.winningTeam!,
      winCondition: this.winCondition!,
      players: this.playerOrder.map((id) => {
        const p = this.playerInfo.get(id)!;
        return {
          id: p.id,
          name: p.name,
          role: p.role,
          team: p.team,
          isAlive: p.isAlive,
        };
      }),
    };
  }

  getPlayerName(id: string): string {
    return this.playerInfo.get(id)?.name ?? 'Unknown';
  }

  getPlayerTeam(id: string): Team | null {
    return this.playerInfo.get(id)?.team ?? null;
  }

  isPlayerAlive(id: string): boolean {
    return this.playerInfo.get(id)?.isAlive ?? false;
  }

  getChancellorPolicies(): PolicyType[] {
    return [...this.chancellorPolicies];
  }
}
