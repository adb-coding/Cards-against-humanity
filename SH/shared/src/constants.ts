import type { ExecutiveAction } from './types.js';

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
export const HITLER_KNOWS_FASCISTS_MAX_PLAYERS = 6;

/** Maps player count to { liberals, fascists, hitler: 1 } */
export const ROLE_DISTRIBUTION: Record<number, { liberals: number; fascists: number }> = {
  5:  { liberals: 3, fascists: 1 },
  6:  { liberals: 4, fascists: 1 },
  7:  { liberals: 4, fascists: 2 },
  8:  { liberals: 5, fascists: 2 },
  9:  { liberals: 5, fascists: 3 },
  10: { liberals: 6, fascists: 3 },
};

export const LIBERAL_POLICIES_IN_DECK = 6;
export const FASCIST_POLICIES_IN_DECK = 11;
export const LIBERAL_POLICIES_TO_WIN = 5;
export const FASCIST_POLICIES_TO_WIN = 6;
export const ELECTION_TRACKER_THRESHOLD = 3;
export const FASCIST_POLICIES_FOR_HITLER_WIN = 3;
export const VETO_UNLOCK_FASCIST_POLICIES = 5;

/**
 * Executive actions by fascist policy slot (0-indexed) for each player-count tier.
 * Slot 5 is always the fascist win condition (not an executive action).
 */
export const EXECUTIVE_ACTIONS: Record<string, ExecutiveAction[]> = {
  '5-6':  ['none', 'none', 'policy-peek', 'execution', 'execution', 'none'],
  '7-8':  ['none', 'investigate-loyalty', 'special-election', 'execution', 'execution', 'none'],
  '9-10': ['investigate-loyalty', 'investigate-loyalty', 'special-election', 'execution', 'execution', 'none'],
};

export function getExecutiveActionTier(playerCount: number): string {
  if (playerCount <= 6) return '5-6';
  if (playerCount <= 8) return '7-8';
  return '9-10';
}
