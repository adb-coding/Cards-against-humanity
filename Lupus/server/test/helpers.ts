import assert from 'node:assert/strict';
import { CONFIGURABLE_ROLES, type NarratorMode, type NightStepId, type RoleCounts, type RoleId } from 'lupus-shared';
import { DEFAULT_TIMING, Room, type Player, type Timing } from '../src/Room.js';

/** Millisecond-scale timings so the automatic narrator can be tested quickly. */
export const FAST: Timing = {
  ...DEFAULT_TIMING,
  fakeMin: 5,
  fakeMax: 10,
  actTimeout: 80,
  wolvesTimeout: 80,
  infoTimeout: 80,
  settleMin: 1,
  settleMax: 3,
  audioExtra: 40,
  hostClaimAfter: 0,
};

export function countRoles(deal: RoleId[]): RoleCounts {
  const counts = Object.fromEntries(CONFIGURABLE_ROLES.map((r) => [r, 0])) as RoleCounts;
  for (const role of deal) if (role !== 'villico') counts[role] += 1;
  return counts;
}

export interface Game {
  room: Room;
  host: Player;
  /** Card-holding players, in the same order as the forced deal. */
  seats: Player[];
  notices: string[];
  removed: string[];
  id: (seat: number) => string;
  aliveSeats: () => number[];
}

export function newRoom(timing: Timing = FAST) {
  const notices: string[] = [];
  const removed: string[] = [];
  const room = new Room('TEST', timing, {
    onChange() {},
    onNotice: (m) => notices.push(m),
    onRemoved: (socketId) => removed.push(socketId),
  });
  const add = (name: string): Player => {
    const result = room.join(name);
    assert.ok('player' in result, 'join failed');
    room.attach(result.player, `socket-${name}`);
    return result.player;
  };
  return { room, notices, removed, add };
}

/** Starts a game where seat `i` holds `deal[i]`. With a human narrator the host sits outside the deal. */
export function setup(
  deal: RoleId[],
  opts: { narrator?: NarratorMode; secretVote?: boolean; timing?: Timing } = {},
): Game {
  const narrator = opts.narrator ?? 'human';
  const { room, notices, removed, add } = newRoom(opts.timing);
  const names = deal.map((_, i) => `P${i}`);
  if (narrator === 'human') names.unshift('Narratore');
  const players = names.map(add);
  const host = players[0];
  assert.equal(
    room.updateSettings(host.id, { narrator, secretVote: opts.secretVote ?? false, roles: countRoles(deal) }),
    null,
  );
  assert.equal(room.start(host.id, deal), null);
  const seats = narrator === 'human' ? players.slice(1) : players;
  seats.forEach((p, i) => assert.equal(p.role, deal[i]));
  return {
    room,
    host,
    seats,
    notices,
    removed,
    id: (seat) => seats[seat].id,
    aliveSeats: () => seats.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0),
  };
}

/**
 * Human-narrator games only: plays a whole night. `choices` maps a step to the seat it targets
 * (null = the role does nothing); steps that are not listed are called and skipped.
 */
export function night(g: Game, choices: Partial<Record<NightStepId, number | null>> = {}): NightStepId[] {
  assert.equal(g.room.advance(g.host.id, g.room.phase), null);
  assert.equal(g.room.phase, 'night');
  const called: NightStepId[] = [];
  while (g.room.phase === 'night') {
    const step = g.room.night!.step;
    called.push(step.id);
    const choice = choices[step.id];
    if (choice !== undefined && !step.fake) {
      assert.equal(g.room.narratorAct(g.host.id, step.id, choice === null ? null : g.id(choice)), null);
      assert.equal(step.decided, true, `step ${step.id} should be decided`);
    }
    assert.equal(g.room.narratorNext(g.host.id, step.id), null);
  }
  return called;
}

/** Dawn -> discussion -> vote, casting `votes` (voter seat -> target seat), then closes the vote. */
export function day(g: Game, votes: Record<number, number> = {}): void {
  assert.equal(g.room.phase, 'dawn');
  g.room.advance(g.host.id, 'dawn');
  g.room.advance(g.host.id, 'discussion');
  assert.equal(g.room.phase, 'voting');
  castAndClose(g, votes);
}

export function castAndClose(g: Game, votes: Record<number, number>): void {
  for (const [voter, target] of Object.entries(votes)) {
    assert.equal(g.room.castVote(g.id(Number(voter)), g.id(target)), null);
  }
  g.room.advance(g.host.id, 'voting');
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitFor(condition: () => boolean, label: string, timeout = 3000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) assert.fail(`timed out waiting for: ${label}`);
    await sleep(2);
  }
}
