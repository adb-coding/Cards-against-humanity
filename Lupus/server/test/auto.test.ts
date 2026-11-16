import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import test from 'node:test';
import { CONFIGURABLE_ROLES, ROLE_OPTIONS, checkDeck, deckCounts, type RoleCounts, type RoleId } from 'lupus-shared';
import type { Room } from '../src/Room.js';
import { FAST, newRoom, setup, sleep, waitFor, type Game } from './helpers.js';

const V: RoleId = 'villico';
const pick = <T>(items: T[]): T => items[randomInt(items.length)];

function stepId(room: Room): string | null {
  return room.phase === 'night' ? room.night!.step.id : null;
}

// ───────────────────────── Automatic narrator ─────────────────────────

test('auto narrator: roles are called one at a time and act from their own phone', async () => {
  const g = setup(['lupo', 'veggente', 'cacciatore', V, V, V], { narrator: 'auto' });
  g.room.advance(g.host.id, 'setup');
  assert.equal(stepId(g.room), 'veggente');

  // Only the seer is asked to act; everybody else just sees which role is awake.
  for (const [i, player] of g.seats.entries()) {
    const view = g.room.viewFor(player);
    assert.deepEqual(view.nightStep, { id: 'veggente', title: 'Il Veggente' });
    assert.equal(view.me!.action !== null, i === 1);
  }
  assert.equal(g.room.nightAct(g.id(0), 'veggente', g.id(3)), 'Non è il tuo turno.');
  assert.equal(g.room.nightAct(g.id(1), 'veggente', g.id(1)), 'Scelta non valida.', 'not himself');
  assert.equal(g.room.nightAct(g.id(1), 'veggente', null), 'Devi scegliere qualcuno.');
  assert.equal(g.room.nightAct(g.id(1), 'lupi', g.id(3)), null, 'acting on another step is ignored');

  assert.equal(g.room.nightAct(g.id(1), 'veggente', g.id(0)), null);
  let action = g.room.viewFor(g.seats[1]).me!.action!;
  assert.match(action.result!, /P0: È un lupo mannaro/);
  assert.equal(action.needsAck, true);
  assert.equal(g.room.nightAct(g.id(1), 'veggente', g.id(3)), null);
  assert.equal(g.room.night!.step.targetId, g.id(0), 'the choice cannot be changed');

  await sleep(30);
  assert.equal(stepId(g.room), 'veggente', 'the night waits for the seer to confirm');
  g.room.nightAck(g.id(1), 'veggente');
  await waitFor(() => stepId(g.room) === 'lupi', 'wolves step');

  g.room.nightAct(g.id(0), 'lupi', g.id(3));
  action = g.room.viewFor(g.seats[0]).me!.action!;
  assert.equal(action.decided, true);
  assert.equal(action.needsAck, false);
  await waitFor(() => stepId(g.room) === 'cacciatore', 'hunter step');

  assert.equal(g.room.viewFor(g.seats[2]).me!.action!.canSkip, true);
  g.room.nightAct(g.id(2), 'cacciatore', null);
  await waitFor(() => g.room.phase === 'dawn', 'dawn');
  assert.deepEqual(g.room.nightDeaths, [g.id(3)]);
});

test('auto narrator: steps of dead roles pass on their own, and so do roles that do not answer', async () => {
  const g = setup(['lupo', 'veggente', V, V, V, V], { narrator: 'auto' });
  g.room.advance(g.host.id, 'setup');
  // Nobody touches their phone: both steps time out and the wolves kill nobody.
  await waitFor(() => g.room.phase === 'dawn', 'dawn after timeouts');
  assert.deepEqual(g.room.nightDeaths, []);

  g.seats[1].alive = false; // the seer is gone
  g.room.advance(g.host.id, 'dawn');
  g.room.advance(g.host.id, 'discussion');
  g.room.advance(g.host.id, 'voting');
  g.room.advance(g.host.id, 'verdict');
  assert.equal(stepId(g.room), 'veggente');
  assert.equal(g.room.night!.step.fake, true);
  assert.equal(g.room.viewFor(g.seats[1]).me!.action, null);
  await waitFor(() => stepId(g.room) === 'lupi', 'faked seer step ends by itself');
});

test('auto narrator: when time runs out the wolves take the most wanted victim', async () => {
  const g = setup(['lupo', 'lupo', 'lupo', V, V, V, V, V, V, V], { narrator: 'auto' });
  g.room.advance(g.host.id, 'setup');
  g.room.nightAct(g.id(0), 'lupi', g.id(5));
  g.room.nightAct(g.id(1), 'lupi', g.id(5));
  g.room.nightAct(g.id(2), 'lupi', g.id(6));
  const view = g.room.viewFor(g.seats[2]).me!.action!;
  assert.deepEqual(view.packPicks, { [g.id(0)]: g.id(5), [g.id(1)]: g.id(5), [g.id(2)]: g.id(6) });
  assert.equal(view.decided, false);
  await waitFor(() => g.room.phase === 'dawn', 'dawn');
  assert.deepEqual(g.room.nightDeaths, [g.id(5)]);
});

// ───────────────────────── Sessions ─────────────────────────

test('a disconnected player keeps seat, role and private notes', () => {
  const g = setup(['lupo', 'veggente', V, V, V], { narrator: 'auto' });
  const seer = g.seats[1];
  g.room.advance(g.host.id, 'setup');
  g.room.nightAct(seer.id, 'veggente', g.id(0));

  g.room.detach(seer.socketId!);
  assert.equal(g.room.viewFor(g.host).players[1].connected, false);
  assert.equal(g.room.findByToken(seer.token), seer);

  assert.equal(g.room.attach(seer, 'new-socket'), null);
  const view = g.room.viewFor(seer);
  assert.equal(view.me!.role, 'veggente');
  assert.match(view.me!.notes[0].text, /P0: È un lupo/);
  assert.equal(view.me!.action!.needsAck, true, 'the pending step is still there after reconnecting');
  assert.equal(view.players[1].connected, true);
});

test('a player who lost their browser data can take their seat back by name, but only while offline', () => {
  const g = setup(['lupo', V, V, V], { narrator: 'auto' });
  assert.deepEqual(g.room.join('P2'), { error: 'La partita è già iniziata.' });
  assert.deepEqual(g.room.join('Nuovo'), { error: 'La partita è già iniziata.' });
  const oldToken = g.seats[2].token;
  g.room.detach(g.seats[2].socketId!);
  const result = g.room.join(' p2 ');
  assert.ok('player' in result);
  assert.equal(result.player, g.seats[2]);
  assert.notEqual(result.player.token, oldToken, 'the old device loses access');
});

test('leaving mid-game counts as dying; the game adapts', async () => {
  const g = setup(['lupo', 'lupo', 'veggente', V, V, V, V], { narrator: 'auto' });
  g.room.advance(g.host.id, 'setup');
  assert.equal(stepId(g.room), 'veggente');
  g.room.leave(g.id(2)); // the seer walks away during his own step
  assert.equal(g.seats[2].alive, false);
  assert.equal(g.room.findByToken(g.seats[2].token), undefined, 'the seat cannot be resumed');
  await waitFor(() => stepId(g.room) === 'lupi', 'night goes on without him');

  g.room.nightAct(g.id(0), 'lupi', g.id(3));
  g.room.leave(g.id(1)); // one wolf leaves: the other one already agrees with himself
  await waitFor(() => g.room.phase === 'dawn', 'dawn');
  assert.deepEqual(g.room.nightDeaths, [g.id(3)]);

  // The host leaves: someone else becomes the master, and the last wolf leaving ends the game.
  g.room.advance(g.host.id, 'dawn');
  g.room.leave(g.host.id);
  assert.equal(g.room.phase, 'ended');
  assert.equal(g.room.winner, 'villaggio');
  assert.equal(g.room.viewFor(g.seats[4]).hostId, g.id(3));
});

test('the host can be replaced only after being offline for a while', () => {
  const slow = { ...FAST, hostClaimAfter: 60_000 };
  const g = setup(['lupo', V, V, V], { narrator: 'auto', timing: slow });
  assert.equal(g.room.claimHost(g.id(1)), 'Il master è ancora collegato.');
  g.room.detach(g.host.socketId!);
  assert.equal(g.room.claimHost(g.id(1)), 'Il master è ancora collegato.', 'too early');
  g.host.offlineSince = Date.now() - 61_000;
  assert.equal(g.room.claimHost(g.id(1)), null);
  assert.equal(g.room.viewFor(g.seats[2]).hostId, g.id(1));
  assert.equal(g.room.advance(g.id(1), 'setup'), null);
  assert.equal(g.room.phase, 'night');
});

test('a human narrator cannot be replaced: the game stops instead', () => {
  const g = setup(['lupo', V, V, V]);
  g.room.advance(g.host.id, 'setup');
  g.room.detach(g.host.socketId!);
  assert.equal(g.room.claimHost(g.id(1)), null);
  assert.equal(g.room.phase, 'lobby');
  assert.equal(g.seats[0].role, null);
  assert.equal(g.room.viewFor(g.seats[1]).hostId, g.id(1));
});

// ───────────────────────── Random games ─────────────────────────

function randomDeck(n: number): RoleCounts {
  for (;;) {
    const roles = Object.fromEntries(CONFIGURABLE_ROLES.map((r) => [r, pick(ROLE_OPTIONS[r])])) as RoleCounts;
    if (checkDeck(roles, n).ok) return roles;
  }
}

function checkInvariants(room: Room, seats: Game['seats']): void {
  const alive = seats.filter((p) => p.alive);
  const wolves = alive.filter((p) => p.role === 'lupo').length;
  if (room.phase !== 'ended') {
    assert.ok(wolves > 0 && wolves < alive.length - wolves, 'a decided game must have ended');
  }
  const step = room.night?.step;
  if (room.phase === 'night' && step) {
    for (const id of step.actorIds) assert.ok(room.get(id)!.alive, 'only the living act');
  }
  if (room.vote) {
    for (const id of [...room.vote.voters, ...room.vote.candidates]) assert.ok(room.get(id)!.alive);
  }
  for (const p of seats) {
    const view = room.viewFor(p);
    assert.equal(view.narratorView, null);
    if (!p.alive) assert.equal(view.me!.action, null);
    if (room.phase !== 'ended') assert.equal(view.gameOver, null);
  }
}

test('random games with the automatic narrator always reach a consistent end', async () => {
  for (let game = 0; game < 40; game++) {
    const n = 4 + randomInt(12);
    const { room, add } = newRoom({ ...FAST, actTimeout: 30, wolvesTimeout: 30, infoTimeout: 30 });
    const seats = Array.from({ length: n }, (_, i) => add(`G${i}`));
    const host = () => seats.find((p) => p.isHost && !p.left)!;
    room.updateSettings(seats[0].id, { roles: randomDeck(n), secretVote: game % 2 === 0 });
    assert.equal(room.start(seats[0].id), null);
    const deck = deckCounts(room.settings.roles, n);
    for (const [role, count] of Object.entries(deck)) {
      assert.equal(seats.filter((p) => p.role === role).length, count);
    }

    let guard = 0;
    while (room.phase !== 'ended') {
      assert.ok(++guard < 5000, 'game does not end');
      checkInvariants(room, seats);

      if (room.phase === 'night') {
        for (const p of seats) {
          const action = room.viewFor(p).me?.action;
          if (!action) continue;
          if (action.needsAck) room.nightAck(p.id, action.step);
          else if (!action.decided && action.kind !== 'info') {
            const skip = action.canSkip && randomInt(3) === 0;
            if (action.targets.length > 0 || skip) {
              room.nightAct(p.id, action.step, skip ? null : pick(action.targets));
            }
          }
        }
        if (randomInt(60) === 0) room.leave(pick(seats.filter((p) => !p.left)).id);
        await sleep(1);
        continue;
      }
      if (room.phase === 'voting') {
        const vote = room.vote!;
        for (const voter of vote.voters) {
          const options = vote.candidates.filter((id) => id !== voter);
          if (options.length > 0 && randomInt(5) > 0) room.castVote(voter, pick(options));
        }
      }
      assert.equal(room.advance(host().id, room.phase), null);
    }

    const over = room.viewFor(seats[0]).gameOver!;
    const alive = seats.filter((p) => p.alive);
    const wolves = alive.filter((p) => p.role === 'lupo').length;
    const hamster = alive.some((p) => p.role === 'criceto');
    const expected = hamster ? 'criceto' : wolves === 0 ? 'villaggio' : 'lupi';
    assert.equal(over.winner, expected);
    assert.ok(wolves === 0 || wolves >= alive.length - wolves);
    assert.equal(over.players.length, n);
    room.dispose();
  }
});
