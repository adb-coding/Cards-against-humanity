import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIGURABLE_ROLES, checkDeck, deckCounts, recommendedRoles, type RoleId } from 'lupus-shared';
import { castAndClose, countRoles, day, newRoom, night, setup } from './helpers.js';

const V: RoleId = 'villico';

// ───────────────────────── Dealing ─────────────────────────

test('every player gets exactly one card and the cards match the deck', () => {
  for (let n = 4; n <= 24; n++) {
    for (const narrator of ['auto', 'human'] as const) {
      const { room, add } = newRoom();
      const players = Array.from({ length: n + (narrator === 'human' ? 1 : 0) }, (_, i) => add(`G${i}`));
      const host = players[0];
      assert.equal(room.updateSettings(host.id, { narrator }), null);
      assert.deepEqual(room.settings.roles, recommendedRoles(n), 'automatic deck follows the player count');
      assert.equal(room.start(host.id), null);

      const dealt: Record<string, number> = {};
      for (const p of players) {
        if (p === host && narrator === 'human') {
          assert.equal(p.role, null, 'the human narrator has no card');
          continue;
        }
        assert.ok(p.role, 'every other player has a card');
        dealt[p.role] = (dealt[p.role] ?? 0) + 1;
      }
      const expected = deckCounts(room.settings.roles, n);
      for (const [role, count] of Object.entries(expected)) {
        assert.equal(dealt[role] ?? 0, count, `${role} with ${n} players`);
      }
    }
  }
});

test('the deal is shuffled', () => {
  const firstWolf = new Set<number>();
  for (let i = 0; i < 60; i++) {
    const { room, add } = newRoom();
    const players = Array.from({ length: 8 }, (_, k) => add(`G${k}`));
    room.start(players[0].id);
    firstWolf.add(players.findIndex((p) => p.role === 'lupo'));
  }
  assert.ok(firstWolf.size >= 4, 'wolves land on different seats across games');
});

test('invalid decks cannot be started', () => {
  const none = countRoles([]);
  assert.equal(checkDeck({ ...none, lupo: 1 }, 3).ok, false, 'too few players');
  assert.equal(checkDeck({ ...none, lupo: 2 }, 4).ok, false, 'wolves must be fewer than the others');
  assert.equal(checkDeck({ ...none, lupo: 1, veggente: 1, medium: 1, guardia: 1, massone: 2 }, 5).ok, false, 'too many cards');
  assert.equal(checkDeck({ ...none, lupo: 1, veggente: 1 }, 4).villici, 2);

  const { room, add } = newRoom();
  const host = add('A');
  add('B');
  add('C');
  assert.match(room.start(host.id) ?? '', /almeno 4/);
  const d = add('D');
  assert.match(room.start(d.id) ?? '', /Solo il master/);
  room.updateSettings(host.id, { roles: { massone: 1, lupo: 9 } as never });
  assert.equal(room.settings.roles.massone, 0, 'a single mason is not allowed');
  assert.equal(room.settings.roles.lupo, 1, 'out-of-range counts are ignored');
  room.detach('socket-D');
  assert.match(room.start(host.id) ?? '', /disconnessi/);
});

// ───────────────────────── Night resolution ─────────────────────────

test('wolves kill their victim; the seer learns the truth', () => {
  const g = setup(['lupo', V, V, V, 'veggente']);
  assert.deepEqual(night(g, { veggente: 0, lupi: 1 }), ['veggente', 'lupi']);
  assert.equal(g.room.phase, 'dawn');
  assert.deepEqual(g.room.nightDeaths, [g.id(1)]);
  assert.match(g.seats[4].notes.at(-1)!.text, /P0: È un lupo mannaro/);

  day(g);
  night(g, { veggente: 2, lupi: 3 });
  assert.match(g.seats[4].notes.at(-1)!.text, /P2: non è un lupo mannaro/);
});

test('the guard saves the victim but cannot protect the same person twice in a row', () => {
  const g = setup(['lupo', 'guardia', V, V, V, V]);
  night(g, { guardia: 2, lupi: 2 });
  assert.deepEqual(g.room.nightDeaths, [], 'protected victim survives');

  day(g);
  g.room.advance(g.host.id, 'verdict');
  assert.equal(g.room.night!.step.id, 'guardia');
  assert.equal(g.room.narratorAct(g.host.id, 'guardia', g.id(2)), 'Scelta non valida.');
  assert.equal(g.room.narratorAct(g.host.id, 'guardia', g.id(1)), 'Scelta non valida.', 'not herself');
  assert.equal(g.room.narratorAct(g.host.id, 'guardia', g.id(3)), null);
  g.room.narratorNext(g.host.id, 'guardia');
  g.room.narratorAct(g.host.id, 'lupi', g.id(2));
  g.room.narratorNext(g.host.id, 'lupi');
  assert.deepEqual(g.room.nightDeaths, [g.id(2)], 'unprotected the second night');

  day(g);
  g.room.advance(g.host.id, 'verdict');
  assert.equal(g.room.narratorAct(g.host.id, 'guardia', g.id(3)), 'Scelta non valida.');
  assert.equal(g.room.narratorAct(g.host.id, 'guardia', g.id(4)), null);
});

test('the guard only protects from wolves, not from the hunter', () => {
  const g = setup(['lupo', 'guardia', 'cacciatore', V, V, V]);
  night(g, { guardia: 3, lupi: 4, cacciatore: 3 });
  assert.deepEqual(g.room.nightDeaths, [g.id(3), g.id(4)]);
});

test('the werehamster is immune to wolves and dies when the seer looks at it', () => {
  const g = setup(['lupo', 'criceto', 'veggente', V, V, V, V]);
  night(g, { veggente: 3, lupi: 1 });
  assert.deepEqual(g.room.nightDeaths, [], 'wolves cannot eat the hamster');

  day(g);
  night(g, { veggente: 1, lupi: 3 });
  assert.deepEqual(g.room.nightDeaths, [g.id(1), g.id(3)], 'hamster dies with the wolves’ victim');
  assert.match(g.seats[2].notes.at(-1)!.text, /P1: non è un lupo mannaro/, 'the seer sees it as a non-wolf');
});

test('prostitute: dies visiting a wolf', () => {
  const g = setup(['lupo', 'prostituta', V, V, V, V]);
  night(g, { prostituta: 0, lupi: 2 });
  assert.deepEqual(g.room.nightDeaths, [g.id(1), g.id(2)]);
});

test('prostitute: dies visiting the werehamster, even when the wolves attack it in vain', () => {
  const g = setup(['lupo', 'prostituta', 'criceto', V, V, V]);
  night(g, { prostituta: 2, lupi: 2 });
  assert.deepEqual(g.room.nightDeaths, [g.id(1)]);
});

test('prostitute: dies with her host when the wolves attack that house', () => {
  const g = setup(['lupo', 'prostituta', V, V, V, V]);
  night(g, { prostituta: 2, lupi: 2 });
  assert.deepEqual(g.room.nightDeaths, [g.id(1), g.id(2)]);
});

test('prostitute: is safe when the wolves come for her, because she is out', () => {
  const g = setup(['lupo', 'prostituta', V, V, V, V]);
  night(g, { prostituta: 2, lupi: 1 });
  assert.deepEqual(g.room.nightDeaths, []);
});

test('prostitute: survives with her host when the guard protects the house', () => {
  const g = setup(['lupo', 'prostituta', 'guardia', V, V, V]);
  night(g, { prostituta: 3, guardia: 3, lupi: 3 });
  assert.deepEqual(g.room.nightDeaths, []);
});

test('prostitute: staying home (no visit) leaves her exposed to the wolves', () => {
  const g = setup(['lupo', 'prostituta', V, V, V, V]);
  night(g, { prostituta: null, lupi: 1 });
  assert.deepEqual(g.room.nightDeaths, [g.id(1)]);
});

test('prostitute: is not harmed by visiting the mythomaniac the night he turns', () => {
  const g = setup(['lupo', 'prostituta', 'mitomane', V, V, V, V]);
  night(g, { prostituta: 2, lupi: 3, mitomane: 0 });
  assert.deepEqual(g.room.nightDeaths, [g.id(3)]);
  assert.equal(g.seats[2].role, 'lupo');
});

test('hunter: one shot only, then never wakes up again', () => {
  const g = setup(['lupo', 'cacciatore', V, V, V, V, V]);
  night(g, { cacciatore: null, lupi: 2 });
  assert.deepEqual(g.room.nightDeaths, [g.id(2)]);

  day(g);
  g.room.advance(g.host.id, 'verdict');
  g.room.narratorAct(g.host.id, 'lupi', g.id(3));
  g.room.narratorNext(g.host.id, 'lupi');
  assert.equal(g.room.night!.step.id, 'cacciatore');
  assert.equal(g.room.night!.step.fake, false, 'still has the bullet');
  g.room.narratorAct(g.host.id, 'cacciatore', g.id(4));
  g.room.narratorNext(g.host.id, 'cacciatore');
  assert.deepEqual(g.room.nightDeaths, [g.id(3), g.id(4)]);

  day(g);
  g.room.advance(g.host.id, 'verdict');
  g.room.narratorAct(g.host.id, 'lupi', g.id(5));
  g.room.narratorNext(g.host.id, 'lupi');
  assert.equal(g.room.night!.step.id, 'cacciatore', 'the role is still called');
  assert.equal(g.room.night!.step.fake, true, 'but nobody wakes up');
  assert.equal(g.room.narratorAct(g.host.id, 'cacciatore', g.id(0)), null);
  assert.equal(g.room.night!.step.decided, false, 'a spent hunter cannot shoot');
});

test('hunter: shooting the last wolf ends the game, even if the wolf kills him the same night', () => {
  const g = setup(['lupo', 'cacciatore', V, V, V]);
  night(g, { lupi: 1, cacciatore: 0 });
  assert.equal(g.room.phase, 'ended');
  assert.equal(g.room.winner, 'villaggio');
  assert.deepEqual(g.aliveSeats(), [2, 3, 4]);
});

test('mythomaniac: joins the pack at dawn after picking a wolf', () => {
  const g = setup(['lupo', 'mitomane', 'veggente', V, V, V, V, V]);
  const steps = night(g, { veggente: 1, lupi: 3, mitomane: 0 });
  assert.deepEqual(steps, ['veggente', 'lupi', 'mitomane']);
  assert.match(g.seats[2].notes.at(-1)!.text, /P1: non è un lupo/, 'still human while the seer looks');
  assert.equal(g.seats[1].role, 'lupo');
  assert.equal(g.seats[1].originalRole, 'mitomane');

  const wolfView = g.room.viewFor(g.seats[0]);
  assert.deepEqual(wolfView.me!.packIds, [g.id(1)], 'the pack sees its new member');
  const mitoView = g.room.viewFor(g.seats[1]);
  assert.equal(mitoView.me!.role, 'lupo');
  assert.equal(mitoView.me!.faction, 'lupi');
  assert.deepEqual(mitoView.me!.packIds, [g.id(0)]);

  day(g);
  g.room.advance(g.host.id, 'verdict');
  // Second night: no more mythomaniac step, he hunts with the pack and the seer sees a wolf.
  assert.deepEqual(g.room.night!.steps, ['veggente', 'lupi']);
  g.room.narratorAct(g.host.id, 'veggente', g.id(1));
  assert.match(g.seats[2].notes.at(-1)!.text, /P1: È un lupo mannaro/);
  g.room.narratorNext(g.host.id, 'veggente');
  assert.deepEqual(g.room.night!.step.actorIds, [g.id(0), g.id(1)]);

  // The pack must be unanimous.
  assert.equal(g.room.nightAct(g.id(1), 'lupi', g.id(0)), 'Scelta non valida.', 'wolves cannot eat wolves');
  g.room.nightAct(g.id(0), 'lupi', g.id(4));
  assert.equal(g.room.night!.step.decided, false);
  g.room.nightAct(g.id(1), 'lupi', g.id(5));
  assert.equal(g.room.night!.step.decided, false, 'no agreement yet');
  g.room.nightAct(g.id(1), 'lupi', g.id(4));
  assert.equal(g.room.night!.step.decided, true);
  assert.equal(g.room.nightAct(g.id(0), 'lupi', g.id(5)), null);
  assert.equal(g.room.night!.step.targetId, g.id(4), 'locked once agreed');
  g.room.narratorNext(g.host.id, 'lupi');
  assert.deepEqual(g.room.nightDeaths, [g.id(4)]);
});

test('mythomaniac: stays a villager after picking a non-wolf, or when he dies that night', () => {
  const a = setup(['lupo', 'mitomane', V, V, V, V]);
  night(a, { lupi: 2, mitomane: 3 });
  assert.equal(a.seats[1].role, 'mitomane');
  assert.equal(a.room.viewFor(a.seats[1]).me!.faction, 'villaggio');
  day(a);
  assert.deepEqual(night(a, { lupi: 3 }), ['lupi'], 'he never wakes up again');

  const b = setup(['lupo', 'mitomane', V, V, V, V]);
  night(b, { lupi: 1, mitomane: 0 });
  assert.equal(b.seats[1].alive, false);
  assert.equal(b.seats[1].role, 'mitomane', 'a dead mythomaniac does not turn');
});

test('mythomaniac: still turns when the wolf he copied is shot that night', () => {
  const g = setup(['lupo', 'mitomane', 'cacciatore', V, V, V, V]);
  night(g, { lupi: 3, cacciatore: 0, mitomane: 0 });
  assert.equal(g.room.phase, 'dawn', 'the game goes on: there is a new wolf');
  assert.equal(g.seats[1].role, 'lupo');
  assert.deepEqual(g.aliveSeats(), [1, 2, 4, 5, 6]);
});

test('medium: learns from the second night whether the lynched player was a wolf', () => {
  const g = setup(['lupo', 'lupo', 'medium', 'criceto', V, V, V, V, V]);
  assert.deepEqual(night(g, { lupi: 4 }), ['lupi'], 'no medium step on the first night');
  day(g, { 2: 0, 5: 0, 6: 0 });
  assert.equal(g.seats[0].alive, false);

  assert.deepEqual(night(g, { lupi: 5 }), ['medium', 'lupi']);
  assert.match(g.seats[2].notes.at(-1)!.text, /lapidato P0: ERA un lupo mannaro/);

  day(g, { 2: 3, 6: 3, 7: 3 });
  night(g, { lupi: 6 });
  assert.match(g.seats[2].notes.at(-1)!.text, /lapidato P3: NON era un lupo mannaro/, 'the hamster counts as human');

  day(g);
  night(g, { lupi: null });
  assert.match(g.seats[2].notes.at(-1)!.text, /nessuno è stato lapidato/);
});

test('masons recognise each other on the first night only', () => {
  const g = setup(['lupo', 'massone', 'massone', V, V, V]);
  assert.equal(g.room.viewFor(g.seats[1]).me!.masonId, null, 'unknown before the first night');
  g.room.advance(g.host.id, 'setup');
  assert.equal(g.room.night!.step.id, 'massoni');
  const view = g.room.viewFor(g.seats[1]);
  assert.equal(view.me!.action!.kind, 'info');
  assert.match(view.me!.action!.result!, /compagno massone è P2/);
  assert.equal(view.me!.masonId, g.id(2));
  assert.equal(g.room.viewFor(g.seats[3]).me!.action, null, 'others see nothing');
  g.room.narratorNext(g.host.id, 'massoni');
  g.room.narratorAct(g.host.id, 'lupi', g.id(3));
  g.room.narratorNext(g.host.id, 'lupi');
  day(g);
  assert.deepEqual(night(g, { lupi: 4 }), ['lupi'], 'no mason step after the first night');
});

test('roles of dead players are still called, but nobody acts', () => {
  const g = setup(['lupo', 'veggente', 'guardia', V, V, V, V]);
  night(g, { veggente: 3, guardia: 3, lupi: 1 });
  day(g);
  g.room.advance(g.host.id, 'verdict');
  assert.deepEqual(g.room.night!.steps, ['guardia', 'veggente', 'lupi']);
  g.room.narratorNext(g.host.id, 'guardia');
  const step = g.room.night!.step;
  assert.equal(step.id, 'veggente');
  assert.equal(step.fake, true);
  assert.equal(g.room.nightAct(g.id(1), 'veggente', g.id(0)), 'Non è il tuo turno.', 'the dead do not act');
  assert.equal(g.room.viewFor(g.seats[1]).me!.action, null);
});

// ───────────────────────── Voting ─────────────────────────

test('vote: the most voted player is lynched; the dead and self-votes are rejected', () => {
  const g = setup(['lupo', V, V, V, V, V, V]);
  night(g, { lupi: 6 });
  g.room.advance(g.host.id, 'dawn');
  g.room.advance(g.host.id, 'discussion');
  assert.equal(g.room.castVote(g.id(6), g.id(0)), 'Non puoi votare in questa votazione.');
  assert.equal(g.room.castVote(g.id(1), g.id(1)), 'Voto non valido.');
  assert.equal(g.room.castVote(g.id(1), g.id(6)), 'Voto non valido.', 'cannot vote for the dead');
  assert.equal(g.room.castVote(g.host.id, g.id(1)), 'Non puoi votare in questa votazione.', 'the narrator does not vote');
  g.room.castVote(g.id(1), g.id(2));
  g.room.castVote(g.id(1), g.id(3)); // changes his mind
  const open = g.room.viewFor(g.seats[4]).vote!;
  assert.deepEqual(open.ballots, { [g.id(1)]: g.id(3) }, 'open ballots are public');
  castAndClose(g, { 0: 3, 2: 4 });
  assert.equal(g.room.phase, 'verdict');
  assert.equal(g.room.lastVote!.lynchedId, g.id(3));
  assert.deepEqual(g.room.lastVote!.tally[g.id(3)], 2);
  assert.equal(g.seats[3].alive, false);
});

test('vote: a tie goes to a runoff between the tied players, who do not vote', () => {
  const g = setup(['lupo', V, V, V, V, V, V]);
  night(g, { lupi: 6 });
  day(g, { 0: 1, 1: 0, 2: 1, 3: 0 });
  assert.equal(g.room.phase, 'voting', 'runoff');
  assert.equal(g.room.vote!.round, 2);
  assert.deepEqual(g.room.vote!.candidates, [g.id(0), g.id(1)]);
  assert.deepEqual(g.room.vote!.voters, [g.id(2), g.id(3), g.id(4), g.id(5)]);
  assert.equal(g.room.castVote(g.id(0), g.id(1)), 'Non puoi votare in questa votazione.');
  assert.equal(g.room.castVote(g.id(2), g.id(3)), 'Voto non valido.', 'only the tied players can be voted');
  castAndClose(g, { 2: 0, 3: 0, 4: 1 });
  assert.equal(g.room.phase, 'ended', 'the only wolf was lynched');
  assert.equal(g.room.winner, 'villaggio');
});

test('vote: a second tie, or no votes at all, lynches nobody', () => {
  const g = setup(['lupo', V, V, V, V, V, V]);
  night(g, { lupi: 6 });
  day(g, { 0: 1, 1: 0 });
  castAndClose(g, { 2: 0, 3: 1 });
  assert.equal(g.room.phase, 'verdict');
  assert.equal(g.room.lastVote!.lynchedId, null);
  assert.deepEqual(g.room.lastVote!.tied, [g.id(0), g.id(1)]);
  assert.deepEqual(g.aliveSeats(), [0, 1, 2, 3, 4, 5]);

  night(g, { lupi: 5 });
  day(g);
  assert.equal(g.room.phase, 'verdict');
  assert.equal(g.room.lastVote!.lynchedId, null);
});

test('secret vote: nobody sees the ballots, only who has voted and the final count', () => {
  const g = setup(['lupo', V, V, V, V, V], { secretVote: true });
  night(g, { lupi: 5 });
  g.room.advance(g.host.id, 'dawn');
  g.room.advance(g.host.id, 'discussion');
  g.room.castVote(g.id(1), g.id(2));
  for (const viewer of [g.seats[2], g.seats[0], g.host]) {
    const vote = g.room.viewFor(viewer).vote!;
    assert.equal(vote.ballots, null);
    assert.deepEqual(vote.voted, [g.id(1)]);
  }
  assert.equal(g.room.viewFor(g.seats[1]).vote!.myVote, g.id(2), 'a player still sees their own vote');
  castAndClose(g, { 3: 2 });
  const result = g.room.viewFor(g.seats[4]).lastVote!;
  assert.equal(result.ballots, null);
  assert.equal(result.tally[g.id(2)], 2);
});

// ───────────────────────── Victory ─────────────────────────

test('wolves win as soon as they are as many as the others', () => {
  const g = setup(['lupo', V, V, V]);
  night(g, { lupi: 1 });
  assert.equal(g.room.phase, 'dawn', '1 wolf vs 2: the game goes on');
  day(g, { 0: 2, 3: 2 });
  assert.equal(g.room.phase, 'ended');
  assert.equal(g.room.winner, 'lupi');
  const over = g.room.viewFor(g.seats[1]).gameOver!;
  assert.deepEqual(over.players.filter((p) => p.won).map((p) => p.id), [g.id(0)]);
});

test('the village wins when the last wolf dies, ghosts included', () => {
  const g = setup(['lupo', V, V, V, V]);
  night(g, { lupi: 1 });
  day(g, { 2: 0, 3: 0 });
  assert.equal(g.room.winner, 'villaggio');
  const over = g.room.viewFor(g.seats[0]).gameOver!;
  assert.deepEqual(over.players.filter((p) => p.won).map((p) => p.id), [g.id(1), g.id(2), g.id(3), g.id(4)]);
  assert.ok(over.journal.length > 0, 'the secret journal is revealed at the end');
});

test('a living werehamster steals the victory from whoever would have won', () => {
  const village = setup(['lupo', 'criceto', V, V, V]);
  night(village, { lupi: 2 });
  day(village, { 1: 0, 3: 0 });
  assert.equal(village.room.winner, 'criceto');
  const winners = village.room.viewFor(village.seats[0]).gameOver!.players.filter((p) => p.won);
  assert.deepEqual(winners.map((p) => p.id), [village.id(1)]);

  const wolves = setup(['lupo', 'criceto', V, V]);
  night(wolves, { lupi: 2 });
  day(wolves, { 0: 3, 1: 3 });
  assert.equal(wolves.room.winner, 'criceto', 'wolf vs hamster: the hamster wins');

  const dead = setup(['lupo', 'criceto', 'veggente', V, V]);
  night(dead, { veggente: 1, lupi: 3 });
  day(dead, { 2: 0, 4: 0 });
  assert.equal(dead.room.winner, 'villaggio', 'a dead hamster wins nothing');
});

// ───────────────────────── Secrecy ─────────────────────────

test('players only ever see their own role; the human narrator sees everything', () => {
  const deal: RoleId[] = ['lupo', 'lupo', 'veggente', 'massone', 'massone', 'criceto', V, V, V];
  const g = setup(deal);
  g.room.advance(g.host.id, 'setup');

  for (const [i, player] of g.seats.entries()) {
    const view = g.room.viewFor(player);
    assert.equal(view.narratorView, null);
    assert.equal(view.gameOver, null);
    assert.equal(view.me!.role, deal[i]);
    const others = JSON.stringify({ ...view, me: null, deck: null, settings: null });
    for (const role of CONFIGURABLE_ROLES) {
      assert.ok(!others.includes(`"${role}"`), `view of P${i} leaks "${role}"`);
    }
    assert.deepEqual(view.me!.packIds, deal[i] === 'lupo' ? [g.id(i === 0 ? 1 : 0)] : [], 'only wolves know the pack');
  }

  const narrator = g.room.viewFor(g.host);
  assert.equal(narrator.me, null);
  assert.equal(Object.keys(narrator.narratorView!.roles).length, deal.length);
  assert.equal(narrator.narratorView!.roles[g.id(5)].role, 'criceto');
});

test('with the automatic narrator not even the host can see other roles', () => {
  const g = setup(['lupo', 'veggente', V, V, V], { narrator: 'auto' });
  const view = g.room.viewFor(g.host);
  assert.equal(view.narratorView, null);
  assert.equal(view.narratorId, null);
  assert.equal(view.me!.role, 'lupo');
  assert.equal(g.room.narratorAct(g.host.id, 'lupi', g.id(1)), 'Solo il narratore può farlo.');
  assert.equal(g.room.advance(g.id(1), 'setup'), 'Solo il master può far avanzare la partita.');
});
