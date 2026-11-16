import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoleId } from 'lupus-shared';
import { countRoles, FAST, newRoom, setup, waitFor } from './helpers.js';

const V: RoleId = 'villico';

/** Host + 5 others in the lobby, human narrator mode, with `narrator` (an index) chosen to narrate. */
function lobbyWithNarrator(narrator: number | null) {
  const { room, notices, add } = newRoom();
  const players = ['Host', 'B', 'C', 'D', 'E', 'F'].map(add);
  const host = players[0];
  assert.equal(
    room.updateSettings(host.id, {
      narrator: 'human',
      narratorId: narrator === null ? null : players[narrator].id,
      roles: countRoles(['lupo', 'veggente']),
    }),
    null,
  );
  return { room, notices, players, host };
}

test('the host can pick which player narrates', () => {
  const { room, players, host } = lobbyWithNarrator(2);
  const narrator = players[2];
  assert.equal(room.settings.narratorId, narrator.id);
  assert.equal(room.updateSettings(narrator.id, { narratorId: host.id }), 'Solo il master può cambiare le impostazioni.');

  assert.equal(room.start(host.id, ['lupo', 'veggente', V, V, V]), null);
  assert.equal(narrator.role, null, 'the chosen narrator has no card');
  assert.equal(host.role, 'lupo', 'the host plays like everybody else');
  assert.deepEqual(
    players.filter((p) => p !== narrator).map((p) => p.role),
    ['lupo', 'veggente', V, V, V],
  );

  // Only the narrator sees the roles and drives the game; the host just plays.
  const hostView = room.viewFor(host);
  assert.equal(hostView.narratorId, narrator.id);
  assert.equal(hostView.narratorView, null);
  assert.equal(hostView.me!.role, 'lupo');
  const narratorView = room.viewFor(narrator);
  assert.equal(narratorView.me, null);
  assert.equal(Object.keys(narratorView.narratorView!.roles).length, 5);

  assert.equal(room.advance(host.id, 'setup'), 'Solo il narratore può far avanzare la partita.');
  assert.equal(room.advance(narrator.id, 'setup'), null);
  assert.equal(room.phase, 'night');
  assert.equal(room.narratorAct(host.id, 'veggente', players[3].id), 'Solo il narratore può farlo.');
  assert.equal(room.narratorAct(narrator.id, 'veggente', host.id), null);
  assert.equal(room.narratorNext(narrator.id, 'veggente'), null);
  assert.equal(room.narratorAct(narrator.id, 'lupi', players[3].id), null);
  assert.equal(room.narratorNext(narrator.id, 'lupi'), null);
  assert.equal(room.phase, 'dawn');
  assert.equal(room.castVote(narrator.id, host.id), null, 'outside a vote nothing happens');

  // The host is still in charge of the room: only they can stop the game.
  assert.equal(room.abort(narrator.id), 'Solo il master può terminare la partita.');
  assert.equal(room.abort(host.id), null);
  assert.equal(room.phase, 'lobby');
  assert.equal(room.settings.narratorId, narrator.id, 'the choice is kept for the next game');
});

test('without a choice, or when the chosen narrator leaves the lobby, the host narrates', () => {
  const { room, players, host } = lobbyWithNarrator(3);
  assert.equal(room.updateSettings(host.id, { narratorId: 'nobody' }), null);
  assert.equal(room.settings.narratorId, null, 'unknown players are ignored');

  room.updateSettings(host.id, { narratorId: players[3].id });
  room.leave(players[3].id);
  assert.equal(room.settings.narratorId, null);
  assert.equal(room.start(host.id), null);
  assert.equal(room.narratorId, host.id);
  assert.equal(host.role, null);
});

test('a chosen narrator who leaves stops the game; a host who leaves does not', () => {
  const a = lobbyWithNarrator(2);
  a.room.start(a.host.id, ['lupo', 'veggente', V, V, V]);
  a.room.leave(a.players[2].id);
  assert.equal(a.room.phase, 'lobby');
  assert.match(a.notices.at(-1)!, /narratore ha lasciato/);

  const b = lobbyWithNarrator(2);
  b.room.start(b.host.id, [V, 'veggente', 'lupo', V, V]);
  b.room.advance(b.players[2].id, 'setup');
  b.room.leave(b.host.id);
  assert.equal(b.room.phase, 'night', 'the game goes on without the host');
  assert.equal(b.room.narratorId, b.players[2].id);
  assert.equal(b.room.viewFor(b.players[2]).hostId, b.players[1].id, 'someone else becomes the master');
});

test('an offline host who is not the narrator can be replaced without stopping the game', () => {
  const { room, players, host } = lobbyWithNarrator(2);
  room.start(host.id, ['lupo', 'veggente', V, V, V]);
  room.advance(players[2].id, 'setup');
  room.detach(host.socketId!);
  assert.equal(room.claimHost(players[4].id), null);
  assert.equal(room.phase, 'night');
  assert.equal(room.viewFor(players[1]).hostId, players[4].id);
  assert.equal(room.narratorId, players[2].id);
});

test('the narrator announces when each role closes its eyes', () => {
  const g = setup(['lupo', 'veggente', V, V, V]);
  g.room.advance(g.host.id, 'setup');
  g.room.narratorNext(g.host.id, 'veggente');
  g.room.narratorAct(g.host.id, 'lupi', g.id(2));
  g.room.narratorNext(g.host.id, 'lupi');
  const narration = g.room.viewFor(g.seats[0]).narration;
  assert.deepEqual(narration.slice(1).map((e) => `${e.scene}: ${e.text}`), [
    'night: Cala la notte su Tabula. Tutti chiudono gli occhi… (notte 1)',
    'night: Il Veggente apre gli occhi e sceglie chi scrutare.',
    'night: Il Veggente chiude gli occhi.',
    'night: I Lupi Mannari aprono gli occhi e scelgono chi sbranare.',
    'night: I Lupi Mannari chiudono gli occhi.',
    'day: Sorge il sole su Tabula. Questa notte P2 ha perso la vita.',
  ]);
  // Each of those lines carries the recorded clip to play; the welcome line has none.
  assert.deepEqual(narration.map((e) => e.cue), [null, 'night', 'veggente', 'close', 'lupi', 'close', 'dawn']);

  // Every other line of the day is silent.
  g.room.advance(g.host.id, 'dawn');
  g.room.advance(g.host.id, 'discussion');
  g.room.advance(g.host.id, 'voting');
  assert.ok(g.room.viewFor(g.seats[0]).narration.slice(7).every((e) => e.cue === null));
});

test('with the voice on, every night step lasts longer so that players can hear the call', async () => {
  const timing = { ...FAST, fakeMin: 5, fakeMax: 5, audioExtra: 150 };
  const quiet = setup(['lupo', 'veggente', V, V, V], { narrator: 'auto', timing });
  const loud = setup(['lupo', 'veggente', V, V, V], { narrator: 'auto', timing });
  assert.equal(loud.room.updateSettings(loud.host.id, { audio: 'all' }), null, 'ignored once the game has started');
  assert.equal(loud.room.settings.audio, 'off');
  loud.room.settings.audio = 'all';

  for (const g of [quiet, loud]) {
    g.seats[1].alive = false; // dead seer: his step is only faked
    g.room.advance(g.host.id, 'setup');
    assert.equal(g.room.night!.step.fake, true);
  }
  const started = Date.now();
  await waitFor(() => quiet.room.night?.step.id === 'lupi', 'quiet game moves on');
  assert.equal(loud.room.night!.step.id, 'veggente', 'the spoken step is still going');
  await waitFor(() => loud.room.night?.step.id === 'lupi', 'spoken game moves on');
  assert.ok(Date.now() - started >= 150);
  assert.equal(loud.room.updateSettings(loud.host.id, { audio: 'x' as never }), null);

  const { room, add } = newRoom();
  const host = add('A');
  room.updateSettings(host.id, { audio: 'master' });
  assert.equal(room.settings.audio, 'master');
  room.updateSettings(host.id, { audio: 'x' as never });
  assert.equal(room.settings.audio, 'master', 'unknown values are ignored');
});
