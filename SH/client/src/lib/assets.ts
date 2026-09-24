import type { PolicyType, Role, Team, Vote } from 'shared';

/** Resolves a file in public/assets against the app's base path (/sh/ in production). */
export function asset(file: string): string {
  return `${import.meta.env.BASE_URL}assets/${file}`;
}

export const policyCardImg = (policy: PolicyType) => asset(`board-policy-${policy}.png`);
export const partyCardImg = (team: Team) => asset(`party-membership-${team}.png`);
export const playerRoleIcon = (role: Role) => asset(`player-icon-${role}.png`);
export const voteBubbleImg = (vote: Vote) => asset(`player-icon-${vote}.png`);

const ROLE_CARD_VARIANTS: Record<Role, string[]> = {
  liberal: ['role-liberal-1.png', 'role-liberal-2.png', 'role-liberal-4.png', 'role-liberal-6.png'],
  fascist: ['role-fascist-1.png', 'role-fascist-2.png', 'role-fascist-3.png'],
  hitler: ['role-hitler.png'],
};

/** Picks a role card illustration; stable for a given player name so it never changes mid-game. */
export function roleCardImg(role: Role, playerName: string): string {
  const variants = ROLE_CARD_VARIANTS[role];
  let hash = 0;
  for (const ch of playerName) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return asset(variants[hash % variants.length]);
}

export const ROLE_LABELS: Record<Role, string> = {
  liberal: 'Liberal',
  fascist: 'Fascist',
  hitler: 'Hitler',
};
