import { useEffect, useRef } from 'react';
import type { GameView } from 'lupus-shared';
import { play, preloadAudio, stopAll, vibrate } from './audio.js';

/** True on the phone that moves the game forward: the narrator's, or the host's when the app narrates. */
export function drivesGame(view: GameView): boolean {
  return view.narratorId ? view.narratorId === view.youId : view.hostId === view.youId;
}

/**
 * Plays the narrator's recorded voice, when the room has it switched on:
 *  - a bell tolls and "cala la notte" is spoken when the night begins;
 *  - each role is called when it opens its eyes, and told to close them when it is done;
 *  - when the night ends the rooster crows and the narrator says that a new day has come.
 *    Who died is never spoken: that is read on the screen once the eyes are open.
 *  - every phone gives a short buzz at each call and a long one at dawn. The buzz is the same
 *    for everybody, so it never gives away whose turn it is.
 * Which phones speak is the host's choice: only the one driving the game, or everyone's.
 */
export function useNarratorVoice(view: GameView): void {
  const lastId = useRef<number | null>(null);
  const audio = view.settings.audio;
  const speaks = audio === 'all' || (audio === 'master' && drivesGame(view));

  useEffect(() => {
    if (speaks) preloadAudio();
  }, [speaks]);

  useEffect(() => {
    const previous = lastId.current;
    lastId.current = view.narration.at(-1)?.id ?? 0;
    // Right after loading (or reloading) the page there is nothing to catch up on.
    if (previous === null || audio === 'off') return;

    const cues = view.narration.filter((entry) => entry.id > previous && entry.cue).map((entry) => entry.cue!);
    if (cues.length === 0) return;

    vibrate(cues.includes('dawn') ? [500, 200, 500, 200, 800] : 120);
    if (!speaks) return;
    for (const cue of cues) {
      if (cue === 'night') play('bell');
      if (cue === 'dawn') play('rooster');
      play(cue);
    }
  }, [view, audio, speaks]);

  // Leaving the table (game aborted, back to the lobby) cuts the narrator off.
  useEffect(() => stopAll, []);
}
