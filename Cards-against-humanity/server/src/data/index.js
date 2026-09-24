// Card packs are discovered automatically: every file in languages/<lang>/<pack>.js
// that exports `blackCards` and `whiteCards` becomes a selectable pack.
// A pack may also export `name` (display name); otherwise the file name is used.
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LANGUAGE_NAMES = { en: 'English', it: 'Italiano', de: 'Deutsch', fr: 'Français', es: 'Español' };
const DEFAULT_PACK_NAMES = { base: 'Base game' };

const languagesDir = join(dirname(fileURLToPath(import.meta.url)), 'languages');

const allCards = {};
for (const lang of readdirSync(languagesDir, { withFileTypes: true })) {
  if (!lang.isDirectory()) continue;
  const packs = {};
  const files = readdirSync(join(languagesDir, lang.name)).filter((f) => f.endsWith('.js')).sort();
  for (const file of files) {
    const mod = await import(pathToFileURL(join(languagesDir, lang.name, file)).href);
    if (!Array.isArray(mod.blackCards) || !Array.isArray(mod.whiteCards)) continue;
    const id = file.replace(/\.js$/, '');
    packs[id] = mod;
  }
  if (Object.keys(packs).length) allCards[lang.name] = packs;
}

function packName(id, mod) {
  if (typeof mod.name === 'string') return mod.name;
  return DEFAULT_PACK_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]/g, ' ');
}

// Base pack first, then alphabetical.
const packOrder = (a, b) => (a === 'base' ? -1 : b === 'base' ? 1 : a.localeCompare(b));

export const availableOptions = {
  languages: Object.keys(allCards).map((code) => ({ code, name: LANGUAGE_NAMES[code] ?? code.toUpperCase() })),
  expansionsByLang: Object.fromEntries(
    Object.entries(allCards).map(([lang, packs]) => [
      lang,
      Object.keys(packs)
        .sort(packOrder)
        .map((id) => ({
          id,
          name: packName(id, packs[id]),
          black: packs[id].blackCards.length,
          white: packs[id].whiteCards.length,
        })),
    ])
  ),
};

/** Redraw allowance per player per game; -1 means unlimited. */
export const REDRAW_OPTIONS = [0, 1, 3, -1];

export const DEFAULT_SETTINGS = {
  lang: allCards.en ? 'en' : Object.keys(allCards)[0],
  expansions: ['base'],
  redraws: 1,
};

/** Returns a valid settings object, falling back to defaults for anything unknown. */
export function sanitizeSettings(input = {}, current = DEFAULT_SETTINGS) {
  const lang = allCards[input.lang] ? input.lang : current.lang;
  const packs = allCards[lang] ?? {};
  let expansions = Array.isArray(input.expansions)
    ? [...new Set(input.expansions)].filter((p) => packs[p])
    : current.expansions.filter((p) => packs[p]);
  if (expansions.length === 0) expansions = [Object.keys(packs).sort(packOrder)[0]];
  const redraws = REDRAW_OPTIONS.includes(input.redraws) ? input.redraws : current.redraws;
  return { lang, expansions, redraws };
}

export function getDeck(lang, expansions = ['base']) {
  let black = [];
  let white = [];

  expansions.forEach((pack) => {
    const data = allCards[lang]?.[pack];
    if (data) {
      black = [...black, ...data.blackCards];
      white = [...white, ...data.whiteCards];
    }
  });

  return { black, white };
}
