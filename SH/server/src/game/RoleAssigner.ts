import { ROLE_DISTRIBUTION } from 'shared';
import type { Role } from 'shared';

/** Fisher-Yates shuffle in place */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function assignRoles(playerCount: number): Role[] {
  const dist = ROLE_DISTRIBUTION[playerCount];
  if (!dist) throw new Error(`No role distribution for ${playerCount} players`);

  const roles: Role[] = [
    ...Array<Role>(dist.liberals).fill('liberal'),
    ...Array<Role>(dist.fascists).fill('fascist'),
    'hitler' as Role,
  ];

  return shuffle(roles);
}
