import './style.css';

// Shared Table Night conventions (mirrored in each game's src/tableNight.* file):
// the chosen name travels to the game as ?name=..., and is remembered in localStorage.
const NAME_KEY = 'tableNight.playerName';
const GAME_KEY = 'tableNight.lastGame';

// In production every game lives under its own path on the same site.
// In dev each game runs its own Vite server (see root package.json "dev").
const GAME_URLS = import.meta.env.DEV
  ? { cah: 'http://localhost:5174/cah/', sh: 'http://localhost:5175/sh/', lupus: 'http://localhost:5176/lupus/' }
  : { cah: '/cah/', sh: '/sh/', lupus: '/lupus/' };

const GAME_NAMES = { cah: 'Cards Against Humanity', sh: 'Secret Hitler', lupus: 'Lupus in Tabula' };

// Games shown on the menu but not open yet: their card is greyed out and cannot be picked.
// (Add a "soon" badge to the card's title in index.html when you list a game here.)
const COMING_SOON = [];

const form = document.getElementById('menu');
const nameInput = document.getElementById('name');
const playBtn = document.getElementById('play');
const errorEl = document.getElementById('error');

function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — nothing to remember.
  }
}

function selectedGame() {
  return form.querySelector('input[name="game"]:checked')?.value ?? null;
}

function refresh() {
  const game = selectedGame();
  playBtn.textContent = game ? `Enter ${GAME_NAMES[game]}` : 'Enter the game';
  errorEl.hidden = true;
}

function showError(message, focusEl) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  focusEl?.focus();
}

for (const input of form.querySelectorAll('input[name="game"]')) {
  const soon = COMING_SOON.includes(input.value);
  input.disabled = soon;
  input.closest('.game').classList.toggle('game--soon', soon);
}

nameInput.value = load(NAME_KEY) ?? '';
const lastGame = load(GAME_KEY);
if (lastGame && GAME_URLS[lastGame] && !COMING_SOON.includes(lastGame)) {
  form.querySelector(`input[name="game"][value="${lastGame}"]`).checked = true;
}
refresh();

form.addEventListener('change', refresh);
nameInput.addEventListener('input', () => {
  errorEl.hidden = true;
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const game = selectedGame();

  if (!name) return showError('Enter your name first.', nameInput);
  if (!game || COMING_SOON.includes(game)) {
    return showError('Pick a game to play.', form.querySelector('input[name="game"]:not(:disabled)'));
  }

  save(NAME_KEY, name);
  save(GAME_KEY, game);
  window.location.href = `${GAME_URLS[game]}?name=${encodeURIComponent(name)}`;
});
