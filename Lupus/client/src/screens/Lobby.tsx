import { useState } from 'react';
import { canVibrate, playSample } from '../audio.js';
import {
  CONFIGURABLE_ROLES,
  ROLE_OPTIONS,
  ROLES,
  checkDeck,
  type ConfigurableRole,
  type GameView,
} from 'lupus-shared';
import { useLupus, useServerNow } from '../store.js';
import { backgroundUrl, Button, CardFace, ConfirmButton } from '../ui.js';
import { RulesModal } from './Rules.js';

const AUDIO_MODES = [
  { label: 'No', value: 'off' },
  { label: 'Master', value: 'master' },
  { label: 'Tutti', value: 'all' },
] as const;

const AUDIO_HINT = {
  off: 'Nessun suono: ognuno guarda il proprio schermo.',
  master:
    'Dal telefono di chi guida la partita il narratore chiama chi si sveglia: tutti tengono gli occhi chiusi e li aprono solo quando sono chiamati. All’alba canta il gallo.',
  all: 'Il narratore parla da ogni telefono e all’alba canta il gallo: utile se il tavolo è grande.',
} as const;

const TIMERS = [
  { label: 'Libera', seconds: 0 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
];

export function Lobby({ view }: { view: GameView }) {
  const { leave, kick, start, updateSettings, claimHost } = useLupus();
  const [rules, setRules] = useState(false);
  const [copied, setCopied] = useState(false);
  const now = useServerNow(view.hostOfflineSince !== null);

  const { settings, players } = view;
  const isHost = view.hostId === view.youId;
  const human = settings.narrator === 'human';
  const narratorId = human ? (settings.narratorId ?? view.hostId) : null;
  const roleCount = players.length - (human ? 1 : 0);
  const deck = checkDeck(settings.roles, roleCount);
  const offline = players.filter((p) => !p.connected);
  const canClaim =
    !isHost && view.hostOfflineSince !== null && now - view.hostOfflineSince >= view.hostClaimAfter;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(view.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available: the code is on screen anyway.
    }
  };

  const setRole = (role: ConfigurableRole, value: number) => updateSettings({ roles: { [role]: value } });

  let startHint: string | null = null;
  if (!deck.ok) startHint = deck.error;
  else if (offline.length > 0) startHint = 'Attendi o rimuovi i giocatori disconnessi.';

  return (
    <div className="page" style={{ backgroundImage: `url(${backgroundUrl('night')})` }}>
      <div className="page-veil" />
      <header className="page-bar">
        <ConfirmButton className="link-back" confirmLabel="Tocca ancora per uscire" onConfirm={leave}>
          ← Esci dalla stanza
        </ConfirmButton>
        <button type="button" className="icon-btn" onClick={() => setRules(true)} aria-label="Regolamento">
          i
        </button>
      </header>

      <main className="lobby">
        <section className="lobby-code">
          <p className="eyebrow">Codice della stanza</p>
          <button type="button" className="room-code" onClick={copyCode} aria-label="Copia il codice">
            {view.roomCode}
          </button>
          <p className="muted">{copied ? 'Copiato!' : 'Dillo agli altri giocatori (tocca per copiare).'}</p>
        </section>

        {canClaim && (
          <div className="parchment banner">
            <p>Il master è disconnesso.</p>
            <Button onClick={claimHost}>Diventa il master</Button>
          </div>
        )}

        <section className="parchment">
          <h2>
            Abitanti <span className="count">{players.length}</span>
          </h2>
          <ul className="lobby-players">
            {players.map((p) => (
              <li key={p.id} className={p.connected ? '' : 'is-offline'}>
                <span className="lobby-player-name">
                  {p.isHost && <span title="Master">👑 </span>}
                  {p.name}
                  {p.id === view.youId && <em> (tu)</em>}
                </span>
                {p.id === narratorId && <span className="tag">Narratore</span>}
                {!p.connected && <span className="tag tag-warn">Disconnesso</span>}
                {isHost && p.id !== view.youId && (
                  <ConfirmButton className="kick" confirmLabel="Rimuovi?" onConfirm={() => kick(p.id)}>
                    ✕
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="parchment">
          <h2>Regole della partita</h2>
          {!isHost && <p className="muted">Solo il master può cambiarle.</p>}

          <div className="setting">
            <div className="setting-label">
              <strong>Narratore</strong>
              <span>
                {human
                  ? 'Un giocatore fa il narratore: non riceve una carta, vede tutti i ruoli e guida la partita.'
                  : 'L’app racconta la partita. Il master dà il via alle fasi ma gioca come tutti gli altri.'}
              </span>
            </div>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={!human}
                disabled={!isHost}
                onClick={() => updateSettings({ narrator: 'auto' })}
              >
                Automatico
              </button>
              <button
                type="button"
                aria-pressed={human}
                disabled={!isHost}
                onClick={() => updateSettings({ narrator: 'human' })}
              >
                Un giocatore
              </button>
            </div>
            {human && (
              <label className="field">
                <span>Chi fa il narratore</span>
                <select
                  value={narratorId ?? ''}
                  disabled={!isHost}
                  onChange={(e) => updateSettings({ narratorId: e.target.value })}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.isHost ? ' (master)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="setting">
            <div className="setting-label">
              <strong>Voce del narratore</strong>
              <span>{AUDIO_HINT[settings.audio]}</span>
            </div>
            <div className="segmented">
              {AUDIO_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={settings.audio === mode.value}
                  disabled={!isHost}
                  onClick={() => updateSettings({ audio: mode.value })}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {settings.audio !== 'off' && (
              <>
                <Button variant="ghost" onClick={playSample}>
                  Prova la voce su questo telefono
                </Button>
                <span className="muted">
                  Alza il volume e togli la modalità silenziosa.{' '}
                  {canVibrate()
                    ? 'Il telefono vibra a ogni chiamata e all’alba.'
                    : 'Su questo telefono la vibrazione non è disponibile.'}
                </span>
              </>
            )}
          </div>

          <div className="setting">
            <div className="setting-label">
              <strong>Votazione</strong>
              <span>
                {settings.secretVote
                  ? 'Segreta: si vede chi ha votato e il conteggio finale, non chi ha votato chi.'
                  : 'Palese: tutti vedono chi vota chi.'}
              </span>
            </div>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={!settings.secretVote}
                disabled={!isHost}
                onClick={() => updateSettings({ secretVote: false })}
              >
                Palese
              </button>
              <button
                type="button"
                aria-pressed={settings.secretVote}
                disabled={!isHost}
                onClick={() => updateSettings({ secretVote: true })}
              >
                Segreta
              </button>
            </div>
          </div>

          <div className="setting">
            <div className="setting-label">
              <strong>Discussione</strong>
              <span>Conto alla rovescia mostrato a tutti durante il giorno.</span>
            </div>
            <div className="segmented">
              {TIMERS.map((t) => (
                <button
                  key={t.seconds}
                  type="button"
                  aria-pressed={settings.discussionSeconds === t.seconds}
                  disabled={!isHost}
                  onClick={() => updateSettings({ discussionSeconds: t.seconds })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="parchment">
          <h2>
            Le carte <span className="count">{roleCount}</span>
          </h2>
          <div className="setting">
            <div className="setting-label">
              <strong>Mazzo consigliato</strong>
              <span>Sceglie le carte in base al numero di giocatori.</span>
            </div>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={settings.autoRoles}
                disabled={!isHost}
                onClick={() => updateSettings({ autoRoles: true })}
              >
                Sì
              </button>
              <button
                type="button"
                aria-pressed={!settings.autoRoles}
                disabled={!isHost}
                onClick={() => updateSettings({ autoRoles: false })}
              >
                A mano
              </button>
            </div>
          </div>

          <ul className="deck">
            {CONFIGURABLE_ROLES.map((role) => {
              const count = settings.roles[role];
              const options = ROLE_OPTIONS[role];
              const index = options.indexOf(count);
              return (
                <li key={role} className={count > 0 ? 'is-on' : ''}>
                  <CardFace role={role} className="card-thumb" />
                  <span className="deck-name">{role === 'massone' ? 'Massoni' : ROLES[role].name}</span>
                  <span className="stepper">
                    <button
                      type="button"
                      disabled={!isHost || index <= 0}
                      onClick={() => setRole(role, options[index - 1])}
                      aria-label={`Meno ${ROLES[role].name}`}
                    >
                      −
                    </button>
                    <output>{count}</output>
                    <button
                      type="button"
                      disabled={!isHost || index >= options.length - 1}
                      onClick={() => setRole(role, options[index + 1])}
                      aria-label={`Più ${ROLES[role].name}`}
                    >
                      +
                    </button>
                  </span>
                </li>
              );
            })}
            <li className={deck.villici > 0 ? 'is-on' : ''}>
              <CardFace role="villico" className="card-thumb" />
              <span className="deck-name">Villici</span>
              <span className="stepper stepper-auto">
                <output>{Math.max(0, deck.villici)}</output>
              </span>
            </li>
          </ul>
          <p className="muted">I Villici riempiono i posti rimasti.</p>
        </section>

        <section className="lobby-start">
          {isHost ? (
            <>
              <Button onClick={start} disabled={startHint !== null}>
                Distribuisci le carte
              </Button>
              {startHint && <p className="form-error">{startHint}</p>}
            </>
          ) : (
            <p className="muted">
              {deck.ok ? 'In attesa che il master distribuisca le carte…' : `In attesa di altri giocatori. ${deck.error}`}
            </p>
          )}
        </section>
      </main>

      {rules && <RulesModal onClose={() => setRules(false)} />}
    </div>
  );
}
