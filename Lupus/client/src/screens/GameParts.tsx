import { useState } from 'react';
import { isMuted, setMuted } from '../audio.js';
import { ROLES, type GameView, type Note, type PublicPlayer, type RoleId } from 'lupus-shared';
import { useLupus } from '../store.js';
import { Button, CardBack, CardFace, ConfirmButton, Modal } from '../ui.js';

const FACTION_LABEL = { villaggio: 'Villaggio', lupi: 'Lupi Mannari', criceto: 'Solitario' } as const;

// ───────────────────────── Player circle ─────────────────────────

export interface TokenState {
  selectable: boolean;
  selected: boolean;
  dim: boolean;
  /** Just died (dawn) or was just lynched (verdict). */
  fallen: boolean;
  voted: boolean;
  votes: number | null;
  /** Wolves that want this player tonight (seen by the pack and the narrator only). */
  packPicks: number;
  /** Private knowledge about this player: fellow wolf, fellow mason. */
  mark: 'wolf' | 'mason' | null;
  /** Human narrator only. */
  role: RoleId | null;
}

function tokenSize(count: number): number {
  if (count <= 6) return 66;
  if (count <= 9) return 58;
  if (count <= 12) return 52;
  if (count <= 16) return 46;
  if (count <= 20) return 41;
  return 37;
}

/**
 * The village, seated in a circle. The viewer sits at the bottom, everybody else follows in
 * seat order, exactly like around a real table.
 */
export function PlayerCircle({
  seats,
  youId,
  hostId,
  states,
  onTap,
  children,
}: {
  seats: PublicPlayer[];
  youId: string;
  hostId: string;
  states: Record<string, TokenState>;
  onTap: (id: string) => void;
  children: React.ReactNode;
}) {
  const n = seats.length;
  const first = Math.max(0, seats.findIndex((p) => p.id === youId));
  return (
    <div className="circle" style={{ '--token': `${tokenSize(n)}px` } as React.CSSProperties}>
      <div className="circle-center">{children}</div>
      {seats.map((p, i) => {
        const angle = Math.PI / 2 + ((i - first) / n) * Math.PI * 2;
        const s = states[p.id];
        const classes = [
          'token',
          p.id === youId && 'is-me',
          !p.alive && 'is-dead',
          !p.connected && !p.left && 'is-offline',
          s.selectable && 'is-selectable',
          s.selected && 'is-selected',
          s.dim && 'is-dim',
          s.fallen && 'is-fallen',
          s.mark && `mark-${s.mark}`,
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={p.id}
            type="button"
            className={classes}
            style={{ left: `${50 + 40 * Math.cos(angle)}%`, top: `${48 + 39 * Math.sin(angle)}%` }}
            disabled={!s.selectable}
            onClick={() => onTap(p.id)}
            aria-pressed={s.selected}
            aria-label={`${p.name}${p.alive ? '' : ', fuori gioco'}`}
          >
            <span className="token-disc">
              <span className="token-initial">{p.alive ? p.name.slice(0, 1).toUpperCase() : '☠'}</span>
              {s.votes !== null && s.votes > 0 && <span className="token-badge badge-votes">{s.votes}</span>}
              {s.packPicks > 0 && <span className="token-badge badge-pack">🐾{s.packPicks > 1 ? s.packPicks : ''}</span>}
              {s.mark === 'wolf' && <span className="token-badge badge-mark">🐺</span>}
              {s.mark === 'mason' && <span className="token-badge badge-mark">🤝</span>}
              {s.voted && <span className="token-badge badge-voted">✓</span>}
            </span>
            <span className="token-name">
              {p.id === hostId && '👑 '}
              {p.id === youId ? `${p.name} (tu)` : p.name}
            </span>
            {s.role && <span className="token-role">{ROLES[s.role].name}</span>}
            {!p.connected && !p.left && p.alive && <span className="token-role token-off">offline</span>}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────── Role card ─────────────────────────

/**
 * Start of the game: the card lies face down, the player flips it, reads it and sends it
 * to the corner of the screen with "Ok".
 */
export function RoleReveal({ role, onDone }: { role: RoleId; onDone: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const info = ROLES[role];

  const done = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDone, 550);
  };

  return (
    <div className={`reveal ${leaving ? 'is-leaving' : ''}`}>
      <p className="reveal-hint">
        {flipped ? 'Questa è la tua carta. Non mostrarla a nessuno.' : 'Assicurati che nessuno guardi il tuo schermo.'}
      </p>
      <button
        type="button"
        className={`flip ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped(true)}
        aria-label={flipped ? info.name : 'Gira la carta'}
      >
        <span className="flip-inner">
          <CardBack className="flip-side flip-back" />
          <CardFace role={role} className="flip-side flip-front" />
        </span>
      </button>
      {flipped ? (
        <div className="reveal-text">
          <h2>{info.name}</h2>
          <p>{info.power}</p>
          <Button onClick={done}>Ok</Button>
        </div>
      ) : (
        <p className="reveal-tap">Tocca la carta per girarla</p>
      )}
    </div>
  );
}

export function RoleModal({ view, onClose }: { view: GameView; onClose: () => void }) {
  const me = view.me!;
  const info = ROLES[me.role];
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '?';
  return (
    <Modal onClose={onClose}>
      <div className="role-sheet">
        <CardFace role={me.role} className="card-large" />
        <h2>{info.name}</h2>
        <p className="tag">{FACTION_LABEL[me.faction]}</p>
        {me.originalRole !== me.role && (
          <p className="role-extra">Eri il {ROLES[me.originalRole].name}: ora fai parte del branco.</p>
        )}
        <h3>Il tuo scopo</h3>
        <p>{info.goal}</p>
        <h3>I tuoi poteri</h3>
        <p>{info.power}</p>
        {me.role === 'lupo' && (
          <p className="role-extra">
            {me.packIds.length > 0 ? `Il tuo branco: ${me.packIds.map(nameOf).join(', ')}.` : 'Sei l’unico lupo del branco.'}
          </p>
        )}
        {me.role === 'massone' && (
          <p className="role-extra">
            {me.masonId ? `Il tuo compagno massone è ${nameOf(me.masonId)}.` : 'Conoscerai il tuo compagno la prima notte.'}
          </p>
        )}
        {me.notes.length > 0 && (
          <>
            <h3>Ciò che sai</h3>
            <NoteList notes={me.notes} />
          </>
        )}
      </div>
    </Modal>
  );
}

export function NoteList({ notes, label = 'Notte' }: { notes: Note[]; label?: string }) {
  return (
    <ul className="notes">
      {notes.map((note, i) => (
        <li key={i}>
          <span className="notes-round">{note.round > 0 ? `${label} ${note.round}` : 'Inizio'}</span>
          {note.text}
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── Other panels ─────────────────────────

export function HistoryModal({ view, onClose }: { view: GameView; onClose: () => void }) {
  return (
    <Modal title="Cronaca del villaggio" onClose={onClose}>
      <ol className="history">
        {view.narration.map((entry) => (
          <li key={entry.id} className={`history-${entry.scene}`}>
            {entry.text}
          </li>
        ))}
      </ol>
    </Modal>
  );
}

export function JournalModal({ view, onClose }: { view: GameView; onClose: () => void }) {
  const journal = view.narratorView?.journal ?? [];
  return (
    <Modal title="Registro del narratore" onClose={onClose}>
      {journal.length === 0 ? (
        <p className="muted">Qui troverai, notte dopo notte, tutto ciò che è accaduto in segreto.</p>
      ) : (
        <NoteList notes={journal} label="Turno" />
      )}
    </Modal>
  );
}

export function MenuModal({
  view,
  onClose,
  onOpen,
}: {
  view: GameView;
  onClose: () => void;
  onOpen: (modal: 'rules' | 'history') => void;
}) {
  const { leave, abort } = useLupus();
  const isHost = view.hostId === view.youId;
  const [muted, setMutedState] = useState(isMuted);
  return (
    <Modal title={`Stanza ${view.roomCode}`} onClose={onClose}>
      <div className="menu">
        {view.settings.audio !== 'off' && (
          <Button
            variant="ghost"
            aria-pressed={!muted}
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          >
            {muted ? 'Voce e vibrazione: spente su questo telefono' : 'Voce e vibrazione: accese su questo telefono'}
          </Button>
        )}
        <Button variant="ghost" onClick={() => onOpen('rules')}>
          Regolamento
        </Button>
        <Button variant="ghost" onClick={() => onOpen('history')}>
          Cronaca del villaggio
        </Button>
        {isHost && (
          <ConfirmButton
            confirmLabel="Tocca ancora: la partita finisce per tutti"
            onConfirm={() => {
              abort();
              onClose();
            }}
          >
            Termina la partita
          </ConfirmButton>
        )}
        <ConfirmButton confirmLabel="Tocca ancora: non potrai rientrare" onConfirm={leave}>
          Abbandona la partita
        </ConfirmButton>
        <p className="muted">
          Se ricarichi la pagina o blocchi il telefono resti in partita: si esce solo da qui.
        </p>
      </div>
    </Modal>
  );
}

const WINNER_TITLE = {
  villaggio: 'Vince il villaggio',
  lupi: 'Vincono i lupi mannari',
  criceto: 'Vince il Criceto Mannaro',
} as const;

export function GameOver({ view }: { view: GameView }) {
  const { advance, leave } = useLupus();
  const over = view.gameOver!;
  const canRestart = view.hostId === view.youId || view.narratorId === view.youId;
  const mine = over.players.find((p) => p.id === view.youId);
  return (
    <div className="gameover">
      <div className="gameover-inner parchment">
        <p className="eyebrow">Fine della partita</p>
        <h1 className={`winner winner-${over.winner}`}>{WINNER_TITLE[over.winner]}</h1>
        <p className="gameover-reason">{over.reason}</p>
        {mine && <p className="tag">{mine.won ? 'Hai vinto!' : 'Hai perso'}</p>}

        <h3>Chi era chi</h3>
        <ul className="reveal-list">
          {over.players.map((p) => (
            <li key={p.id} className={`${p.won ? 'is-winner' : ''} ${p.alive ? '' : 'is-dead'}`}>
              <CardFace role={p.role} className="card-thumb" />
              <span className="reveal-name">
                {p.name}
                {!p.alive && <span aria-label="fuori gioco"> ☠</span>}
              </span>
              <span className="reveal-role">
                {ROLES[p.role].name}
                {p.originalRole !== p.role && <em> (era {ROLES[p.originalRole].name})</em>}
              </span>
            </li>
          ))}
        </ul>

        <h3>Cosa è successo in segreto</h3>
        <NoteList notes={over.journal} label="Turno" />

        <div className="gameover-actions">
          {canRestart ? (
            <Button onClick={() => advance('ended')}>Torna alla sala d’attesa</Button>
          ) : (
            <p className="muted">In attesa che il master apra una nuova partita…</p>
          )}
          <ConfirmButton confirmLabel="Tocca ancora per uscire" onConfirm={leave}>
            Esci dalla stanza
          </ConfirmButton>
        </div>
      </div>
    </div>
  );
}
