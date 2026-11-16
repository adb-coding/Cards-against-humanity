import type { SessionInfo } from 'lupus-shared';

// The seat in a room belongs to a secret token, not to the socket: keeping the token lets a
// refresh, a locked phone or a dropped connection come straight back into the game.
//  - sessionStorage identifies *this tab* (survives a refresh);
//  - localStorage is the backup for a tab that was closed and reopened. It is only used when
//    nobody is currently sitting in that seat, so a second tab never steals the first one's.
const KEY = 'lupus.session';

function read(storage: Storage): SessionInfo | null {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? 'null');
    return parsed && typeof parsed.roomCode === 'string' && typeof parsed.token === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function loadSession(): { session: SessionInfo; fromBackup: boolean } | null {
  try {
    const own = read(sessionStorage);
    if (own) return { session: own, fromBackup: false };
    const backup = read(localStorage);
    return backup ? { session: backup, fromBackup: true } : null;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionInfo): void {
  try {
    const value = JSON.stringify(session);
    sessionStorage.setItem(KEY, value);
    localStorage.setItem(KEY, value);
  } catch {
    // Storage unavailable: the game still works, but a refresh will lose the seat.
  }
}

export function clearSession(scope: 'tab' | 'all'): void {
  try {
    const own = read(sessionStorage);
    sessionStorage.removeItem(KEY);
    // Only drop the backup if it is ours: another tab may have joined a different room since.
    if (scope === 'all' && (!own || read(localStorage)?.token === own.token)) localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
