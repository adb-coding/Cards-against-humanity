// Shared Table Night conventions (mirrored in Cards-against-humanity/client/src/tableNight.js and launcher/src/main.js):
// the menu passes the chosen player name as ?name=..., and it is remembered in localStorage.
const NAME_KEY = 'tableNight.playerName';

export const MENU_URL: string =
  import.meta.env.VITE_MENU_URL || (import.meta.env.DEV ? 'http://localhost:5173/' : '/');

function readInitialPlayerName(): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('name')?.trim().slice(0, 20);
  if (fromUrl) {
    savePlayerName(fromUrl);
    params.delete('name');
    const query = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
    return fromUrl;
  }
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage unavailable (private mode) — the name just won't be remembered.
  }
}

export const INITIAL_PLAYER_NAME = readInitialPlayerName();
