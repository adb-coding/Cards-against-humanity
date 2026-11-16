// The narrator's voice: recorded lines (public/assets/audio) played through Web Audio,
// plus the phone's vibration.
//
// Browsers only allow sound after the user has touched the page, so the first tap anywhere
// "unlocks" the audio context; from then on clips can start on their own.

const MUTE_KEY = 'lupus.muted';
const AUDIO_URL = `${import.meta.env.BASE_URL}assets/audio/`;

/** Recorded clips: the narrator's lines, one per night role, and two sound effects. */
export type Clip =
  | 'night'
  | 'massoni'
  | 'medium'
  | 'prostituta'
  | 'guardia'
  | 'veggente'
  | 'lupi'
  | 'cacciatore'
  | 'mitomane'
  | 'close'
  | 'dawn'
  | 'rooster'
  | 'bell';

const ALL_CLIPS: Clip[] = [
  'night',
  'massoni',
  'medium',
  'prostituta',
  'guardia',
  'veggente',
  'lupi',
  'cacciatore',
  'mitomane',
  'close',
  'dawn',
  'rooster',
  'bell',
];

/** Silence left between two clips, in ms. */
const GAP = 300;

let context: AudioContext | null = null;
const buffers = new Map<Clip, Promise<AudioBuffer | null>>();
let playing: AudioBufferSourceNode | null = null;
/** Clips are played one after the other: bell, "cala la notte", a role, "occhi chiusi"... */
let queue: Promise<void> = Promise.resolve();
/** Bumped by stopAll(): whatever was queued before is dropped. */
let epoch = 0;

export const canVibrate = (): boolean => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // Storage unavailable: the choice lasts until the page is reloaded.
  }
  if (muted) stopAll();
}

function audioContext(): AudioContext | null {
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/** Call from a user gesture (any tap): lets later clips play without one. */
export function unlockAudio(): void {
  void audioContext()?.resume().catch(() => undefined);
}

if (typeof window !== 'undefined') {
  // Phones suspend the audio context again when the page goes to the background,
  // so every tap makes sure it is running.
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
}

function load(clip: Clip): Promise<AudioBuffer | null> {
  let buffer = buffers.get(clip);
  if (!buffer) {
    const ctx = audioContext();
    buffer = ctx
      ? fetch(`${AUDIO_URL}${clip}.mp3`)
          .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${clip}: ${res.status}`))))
          .then((data) => ctx.decodeAudioData(data))
          .catch(() => {
            buffers.delete(clip); // network hiccup: try again next time
            return null;
          })
      : Promise.resolve(null);
    buffers.set(clip, buffer);
  }
  return buffer;
}

/** Downloads every clip ahead of time, so the night starts without delays. */
export function preloadAudio(): void {
  for (const clip of ALL_CLIPS) void load(clip);
}

async function playNow(clip: Clip): Promise<void> {
  const ctx = audioContext();
  if (!ctx) return;
  const buffer = await load(clip);
  if (!buffer) return;
  if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
  if (ctx.state !== 'running') return; // the user has not touched the page yet

  await new Promise<void>((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    // `ended` also fires when stopAll() cuts the clip short; the timer is a safety net.
    const giveUp = setTimeout(resolve, buffer.duration * 1000 + 1000);
    source.onended = () => {
      clearTimeout(giveUp);
      if (playing === source) playing = null;
      resolve();
    };
    playing = source;
    source.start();
  });
  await new Promise((resolve) => setTimeout(resolve, GAP));
}

/** Plays a clip after whatever is already playing. */
export function play(clip: Clip): void {
  const mine = epoch;
  queue = queue
    .then(() => (mine === epoch && !isMuted() ? playNow(clip) : undefined))
    .catch(() => undefined);
}

export function vibrate(pattern: number | number[]): void {
  if (!canVibrate() || isMuted()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Not allowed here (e.g. no user interaction yet): nothing to do.
  }
}

export function stopAll(): void {
  epoch += 1;
  try {
    playing?.stop();
  } catch {
    // already stopped
  }
  playing = null;
  if (canVibrate()) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
}

/** Lobby button: lets every player check that their phone can be heard. */
export function playSample(): void {
  unlockAudio();
  stopAll();
  play('veggente');
  play('rooster');
  vibrate([200, 100, 200]);
}
