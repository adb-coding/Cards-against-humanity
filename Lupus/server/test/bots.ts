/**
 * Fills a room with bots so the game can be tried alone.
 *
 *   npm run bots -w lupus-server -- ABCD 6
 *
 * joins room ABCD with 6 bots. They look at their card, play their role at night and vote
 * during the day, all at random and after a short human-like pause. They never drive the
 * phases: the host does. Stop them with Ctrl+C (their seats stay in the game, disconnected).
 */
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, GameView, ServerToClientEvents } from 'lupus-shared';

const NAMES = ['Berta', 'Corrado', 'Dalia', 'Elmo', 'Fosca', 'Gualtiero', 'Ilde', 'Lapo', 'Mafalda', 'Nello', 'Orsola', 'Piero'];

const [code, countArg, urlArg] = process.argv.slice(2);
if (!code) {
  console.error('Usage: bots <ROOM CODE> [how many = 5] [server url = http://localhost:3001]');
  process.exit(1);
}
const count = Math.min(NAMES.length, Math.max(1, Number(countArg) || 5));
const url = urlArg ?? 'http://localhost:3001';
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const pause = () => 1200 + Math.random() * 2500;

for (const name of NAMES.slice(0, count)) {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
    path: '/lupus/socket.io',
    transports: ['websocket'],
  });
  let view: GameView | null = null;
  const handled = new Set<string>();
  /** Runs `fn` once per `key`, after a pause, if the situation is still the same. */
  const once = (key: string, fn: (v: GameView) => void) => {
    if (handled.has(key)) return;
    handled.add(key);
    setTimeout(() => view && fn(view), pause());
  };

  socket.on('connect', () => {
    socket.emit('room:join', { name, roomCode: code }, (res) => {
      console.log(res.ok ? `${name} è nella stanza` : `${name}: ${res.error}`);
    });
  });

  socket.on('state', (next) => {
    view = next;
    const me = next.players.find((p) => p.id === next.youId);
    if (next.phase === 'lobby') handled.clear();
    if (next.phase === 'setup' && me && !me.seenCard) once('card', () => socket.emit('game:seen-card'));

    const action = next.me?.action;
    if (next.phase === 'night' && action) {
      const key = `${next.round}:${action.step}`;
      if (action.needsAck) {
        once(`${key}:ack`, () => socket.emit('night:ack', { step: action.step }));
      } else if (!action.decided && action.kind === 'pick' && action.targets.length > 0) {
        once(key, () => socket.emit('night:act', { step: action.step, targetId: pick(action.targets) }));
      } else if (!action.decided && action.kind === 'wolves') {
        // Follow whatever another wolf proposed, otherwise propose someone.
        const proposed = Object.values(action.packPicks ?? {}).find((t) => t !== null) ?? null;
        const mine = action.packPicks?.[next.youId] ?? null;
        if (mine === null || (proposed !== null && proposed !== mine)) {
          once(`${key}:${proposed ?? 'new'}`, (v) => {
            const now = v.me?.action;
            if (!now || now.decided || now.step !== action.step) return;
            const lead = Object.values(now.packPicks ?? {}).find((t) => t !== null) ?? pick(now.targets);
            socket.emit('night:act', { step: action.step, targetId: lead });
          });
        }
      }
    }

    const vote = next.vote;
    if (next.phase === 'voting' && vote && vote.voters.includes(next.youId) && !vote.myVote) {
      once(`vote:${next.round}:${vote.round}`, (v) => {
        const options = v.vote?.candidates.filter((id) => id !== v.youId) ?? [];
        if (options.length > 0) socket.emit('vote:cast', { targetId: pick(options) });
      });
    }
  });

  socket.on('session:ended', (data) => {
    console.log(`${name}: ${data.message}`);
    socket.disconnect();
  });
}
