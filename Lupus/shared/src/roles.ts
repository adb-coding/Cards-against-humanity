export type RoleId =
  | 'villico'
  | 'lupo'
  | 'veggente'
  | 'medium'
  | 'guardia'
  | 'prostituta'
  | 'cacciatore'
  | 'criceto'
  | 'mitomane'
  | 'massone';

export type Faction = 'villaggio' | 'lupi' | 'criceto';

/** Every role except the Villico, which automatically fills the remaining seats. */
export type ConfigurableRole = Exclude<RoleId, 'villico'>;
export type RoleCounts = Record<ConfigurableRole, number>;

export interface RoleInfo {
  id: RoleId;
  name: string;
  /** Faction the card starts in (the Mitomane may switch to the wolves). */
  faction: Faction;
  /** Card art under /assets/cards, or null when no illustration exists yet. */
  image: string | null;
  /** One line printed on the card. */
  tagline: string;
  goal: string;
  power: string;
}

const VILLAGE_GOAL = 'Vinci con il villaggio quando tutti i lupi mannari sono stati eliminati.';

export const ROLES: Record<RoleId, RoleInfo> = {
  villico: {
    id: 'villico',
    name: 'Villico',
    faction: 'villaggio',
    image: 'villico.webp',
    tagline: 'Sopravvivi e scova i lupi.',
    goal: VILLAGE_GOAL,
    power:
      'Nessun potere: di notte dormi. Di giorno discuti con gli altri paesani, osserva e vota per lapidare chi sospetti sia un lupo mannaro.',
  },
  lupo: {
    id: 'lupo',
    name: 'Lupo Mannaro',
    faction: 'lupi',
    image: 'lupo.webp',
    tagline: 'Sbrana di notte, menti di giorno.',
    goal: 'Vinci con il branco quando i lupi sono tanti quanti gli altri abitanti ancora in vita.',
    power:
      'Ogni notte ti svegli insieme agli altri lupi e scegliete una vittima da sbranare: la scelta deve essere unanime. Di giorno non farti scoprire, o il villaggio ti lapiderà.',
  },
  veggente: {
    id: 'veggente',
    name: 'Veggente',
    faction: 'villaggio',
    image: 'veggente.webp',
    tagline: 'Ogni notte scruta un abitante.',
    goal: VILLAGE_GOAL,
    power:
      'Ogni notte indichi un abitante e scopri se è un lupo mannaro oppure no. Se scruti il Criceto Mannaro, questi muore.',
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    faction: 'villaggio',
    image: 'medium.webp',
    tagline: 'Parla con gli spiriti dei lapidati.',
    goal: VILLAGE_GOAL,
    power:
      'Dalla seconda notte ti svegli e scopri se l’abitante lapidato il giorno precedente era un lupo mannaro oppure no.',
  },
  guardia: {
    id: 'guardia',
    name: 'Guardia',
    faction: 'villaggio',
    image: 'guardia.webp',
    tagline: 'Proteggi un abitante dai lupi.',
    goal: VILLAGE_GOAL,
    power:
      'Ogni notte scegli un abitante da proteggere: se i lupi lo attaccano, sopravvive. Non puoi scegliere te, né la stessa persona per due notti di fila.',
  },
  prostituta: {
    id: 'prostituta',
    name: 'Prostituta',
    faction: 'villaggio',
    image: 'prostituta.webp',
    tagline: 'Di notte non dormi mai a casa tua.',
    goal: VILLAGE_GOAL,
    power:
      'Ogni notte vai a casa di un altro abitante. Se vai da un lupo o dal Criceto Mannaro, muori. Se i lupi attaccano la casa in cui ti trovi, morite entrambi. Se invece i lupi vengono a cercare te, non ti trovano: sei salva.',
  },
  cacciatore: {
    id: 'cacciatore',
    name: 'Cacciatore',
    faction: 'villaggio',
    image: 'cacciatore.webp',
    tagline: 'Un solo colpo in canna.',
    goal: VILLAGE_GOAL,
    power:
      'Ti svegli ogni notte, ma hai un solo colpo: puoi sparare a un abitante a tua scelta e ucciderlo, chiunque sia. Dopo aver sparato non ti svegli più.',
  },
  criceto: {
    id: 'criceto',
    name: 'Criceto Mannaro',
    faction: 'criceto',
    image: 'criceto.webp',
    tagline: 'Sopravvivi a tutti e vinci da solo.',
    goal: 'Giochi solo per te stesso: se sei ancora vivo quando la partita finisce, sei l’unico vincitore.',
    power:
      'I lupi non possono sbranarti. Se però il Veggente ti scruta durante la notte, muori. Per il Veggente e per il Medium non sei un lupo.',
  },
  mitomane: {
    id: 'mitomane',
    name: 'Mitomane',
    faction: 'villaggio',
    image: 'mitomane.webp',
    tagline: 'La prima notte scegli chi imitare.',
    goal: 'Vinci con la tua fazione: il villaggio, oppure i lupi se ti unisci al branco.',
    power:
      'La prima notte indichi un abitante: se è un lupo mannaro, all’alba diventi un lupo mannaro anche tu e ti unisci al branco. Altrimenti resti un semplice villico per tutta la partita.',
  },
  massone: {
    id: 'massone',
    name: 'Massone',
    faction: 'villaggio',
    image: 'massone.webp',
    tagline: 'Un fratello di cui fidarti.',
    goal: VILLAGE_GOAL,
    power:
      'I massoni sono sempre in due. La prima notte vi svegliate e vi riconoscete: sapete di potervi fidare l’uno dell’altro. Poi non vi svegliate più.',
  },
};

/** Display order of the configurable roles in the settings panel. */
export const CONFIGURABLE_ROLES: ConfigurableRole[] = [
  'lupo',
  'veggente',
  'medium',
  'guardia',
  'prostituta',
  'cacciatore',
  'massone',
  'criceto',
  'mitomane',
];

/** Allowed number of copies of each card. The Massoni only come as a pair. */
export const ROLE_OPTIONS: Record<ConfigurableRole, number[]> = {
  lupo: [1, 2, 3, 4],
  veggente: [0, 1],
  medium: [0, 1],
  guardia: [0, 1],
  prostituta: [0, 1],
  cacciatore: [0, 1],
  massone: [0, 2],
  criceto: [0, 1],
  mitomane: [0, 1],
};

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 24;

/** Suggested deck for `n` role-holding players, loosely following the official thresholds. */
export function recommendedRoles(n: number): RoleCounts {
  return {
    lupo: n >= 16 ? 3 : n >= 7 ? 2 : 1,
    veggente: 1,
    guardia: n >= 6 ? 1 : 0,
    medium: n >= 9 ? 1 : 0,
    prostituta: n >= 10 ? 1 : 0,
    cacciatore: n >= 11 ? 1 : 0,
    massone: n >= 13 ? 2 : 0,
    criceto: n >= 15 ? 1 : 0,
    mitomane: n >= 16 ? 1 : 0,
  };
}

export function sanitizeRoles(input: Partial<Record<string, unknown>> | undefined, fallback: RoleCounts): RoleCounts {
  const out = { ...fallback };
  for (const role of CONFIGURABLE_ROLES) {
    const value = input?.[role];
    if (typeof value === 'number' && ROLE_OPTIONS[role].includes(value)) out[role] = value;
  }
  return out;
}

export interface DeckCheck {
  ok: boolean;
  /** Number of Villico cards that fill the remaining seats (negative when there are too many special cards). */
  villici: number;
  error: string | null;
}

/** Validates a deck against the number of players who will receive a card. */
export function checkDeck(roles: RoleCounts, roleCount: number): DeckCheck {
  const specials = CONFIGURABLE_ROLES.reduce((sum, r) => sum + roles[r], 0);
  const villici = roleCount - specials;
  let error: string | null = null;
  if (roleCount < MIN_PLAYERS) {
    error = `Servono almeno ${MIN_PLAYERS} giocatori con una carta.`;
  } else if (roleCount > MAX_PLAYERS) {
    error = `Al massimo ${MAX_PLAYERS} giocatori.`;
  } else if (villici < 0) {
    error = `Troppe carte speciali: toglierne ${-villici}.`;
  } else if (roles.lupo * 2 >= roleCount) {
    error = 'Troppi lupi: devono essere meno degli altri abitanti.';
  }
  return { ok: error === null, villici, error };
}

/** Full list of cards dealt for a deck, Villici included. */
export function deckCounts(roles: RoleCounts, roleCount: number): Record<RoleId, number> {
  const { villici } = checkDeck(roles, roleCount);
  return { villico: Math.max(0, villici), ...roles };
}
