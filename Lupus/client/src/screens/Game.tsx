import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GameView } from 'lupus-shared';
import { formatClock, useLupus, useServerNow } from '../store.js';
import { backgroundUrl, Button, CardBack, ConfirmButton } from '../ui.js';
import {
  GameOver,
  HistoryModal,
  JournalModal,
  MenuModal,
  PlayerCircle,
  RoleModal,
  RoleReveal,
  type TokenState,
} from './GameParts.js';
import { RulesModal } from './Rules.js';
import { drivesGame, useNarratorVoice } from '../voice.js';

type Scene = 'night' | 'day' | 'discussion';
type ModalId = 'role' | 'rules' | 'history' | 'menu' | 'journal' | null;

const SCENES: Scene[] = ['night', 'day', 'discussion'];

function countVotes(ballots: Record<string, string>): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const target of Object.values(ballots)) tally[target] = (tally[target] ?? 0) + 1;
  return tally;
}

export function Game({ view }: { view: GameView }) {
  const api = useLupus();
  const [modal, setModal] = useState<ModalId>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { phase, vote, me } = view;
  const you = view.players.find((p) => p.id === view.youId);
  const isHost = view.hostId === view.youId;
  const isNarrator = view.narratorId === view.youId;
  /** This phone moves the game forward: the narrator's, or the master's when the app narrates. */
  const isDriver = drivesGame(view);
  useNarratorVoice(view);
  const seats = useMemo(() => view.players.filter((p) => p.inGame), [view.players]);
  const nameOf = (id: string | null | undefined) => view.players.find((p) => p.id === id)?.name ?? '?';
  const action = me?.action ?? null;
  const nStep = view.narratorView?.step ?? null;
  const isGhost = !!me && !!you && !you.alive;

  const scene: Scene = phase === 'night' ? 'night' : phase === 'discussion' || phase === 'voting' ? 'discussion' : 'day';

  // A selection only makes sense within the step it was made in.
  const contextKey = `${phase}:${view.round}:${view.nightStep?.id ?? ''}:${vote?.round ?? ''}`;
  useEffect(() => setSelected(null), [contextKey]);

  const ticking =
    view.discussionEndsAt !== null || (action?.deadline ?? null) !== null || view.hostOfflineSince !== null;
  const now = useServerNow(ticking);

  // ── What can be tapped right now ──
  let mode: 'none' | 'act' | 'narrate' | 'vote' = 'none';
  let selectable: string[] = [];
  if (phase === 'night') {
    if (action && !action.decided && action.kind !== 'info') {
      mode = 'act';
      selectable = action.targets;
    } else if (nStep && !nStep.fake && !nStep.decided && nStep.kind !== 'info') {
      mode = 'narrate';
      selectable = nStep.targets;
    }
  } else if (phase === 'voting' && vote?.voters.includes(view.youId)) {
    mode = 'vote';
    selectable = vote.candidates.filter((id) => id !== view.youId);
  }
  const choice = selected && selectable.includes(selected) ? selected : null;

  const onTap = (id: string) => {
    if (!selectable.includes(id)) return;
    if (mode === 'vote') api.castVote(vote?.myVote === id ? null : id);
    else setSelected((current) => (current === id ? null : id));
  };

  // ── How each player looks ──
  const tally =
    phase === 'voting' && vote?.ballots
      ? countVotes(vote.ballots)
      : phase === 'verdict' && view.lastVote
        ? view.lastVote.tally
        : null;
  const packPicks = (phase === 'night' && (action?.packPicks ?? nStep?.packPicks)) || null;
  const lockedTarget = phase === 'night' ? (action?.decided ? action.targetId : nStep?.decided ? nStep.targetId : null) : null;
  const highlighted = mode === 'vote' ? (vote?.myVote ?? null) : (choice ?? lockedTarget);
  const fallen =
    phase === 'dawn' ? view.nightDeaths : phase === 'verdict' && view.lastVote?.lynchedId ? [view.lastVote.lynchedId] : [];

  const states: Record<string, TokenState> = {};
  for (const p of seats) {
    states[p.id] = {
      selectable: selectable.includes(p.id),
      selected: highlighted === p.id,
      dim: mode !== 'none' ? !selectable.includes(p.id) && p.id !== view.youId : phase === 'voting' && !vote?.candidates.includes(p.id),
      fallen: fallen.includes(p.id),
      voted: phase === 'voting' && !!vote?.voted.includes(p.id),
      votes: tally ? (tally[p.id] ?? 0) : null,
      packPicks: packPicks ? Object.values(packPicks).filter((t) => t === p.id).length : 0,
      mark: me?.packIds.includes(p.id) ? 'wolf' : me?.masonId === p.id ? 'mason' : null,
      role: view.narratorView?.roles[p.id]?.role ?? null,
    };
  }

  // ── Centre of the table ──
  const seen = seats.filter((p) => p.seenCard).length;
  let title = '';
  let subtitle: ReactNode = null;
  switch (phase) {
    case 'setup':
      title = 'Tabula';
      subtitle = `${seen} su ${seats.length} hanno visto la carta`;
      break;
    case 'night':
      title = `Notte ${view.round}`;
      subtitle = view.nightStep?.title ?? null;
      break;
    case 'dawn':
      title = `Giorno ${view.round}`;
      subtitle = view.nightDeaths.length > 0 ? `† ${view.nightDeaths.map(nameOf).join(', ')}` : 'Nessuna vittima';
      break;
    case 'discussion':
      title = 'Discussione';
      if (view.discussionEndsAt !== null) {
        const left = view.discussionEndsAt - now;
        subtitle = left > 0 ? <span className="clock">{formatClock(left)}</span> : 'Tempo scaduto!';
      } else subtitle = `Giorno ${view.round}`;
      break;
    case 'voting':
      title = vote?.round === 2 ? 'Ballottaggio' : 'Votazione';
      subtitle = vote ? `${vote.voted.length} su ${vote.voters.length} hanno votato` : null;
      break;
    case 'verdict':
      title = 'Verdetto';
      subtitle = view.lastVote?.lynchedId ? `Il villaggio ha lapidato ${nameOf(view.lastVote.lynchedId)}` : 'Oggi nessuna lapidazione';
      break;
  }

  // ── Private box: what this player knows or has to do ──
  let box: ReactNode = null;
  if (phase === 'night' && action) {
    const myPick = action.packPicks?.[view.youId] ?? null;
    const timeLeft = action.deadline !== null ? action.deadline - now : null;
    const done = action.decided || action.kind === 'info';
    box = (
      <div className="box box-action">
        <p className="box-title">
          Tocca a te
          {timeLeft !== null && !done && <span className="box-clock">{formatClock(timeLeft)}</span>}
        </p>
        {done ? (
          <>
            <p className="box-result">{action.result}</p>
            {action.needsAck ? (
              <Button onClick={() => api.nightAck(action.step)}>Ho capito</Button>
            ) : (
              <p className="muted">Richiudi gli occhi e attendi l’alba.</p>
            )}
          </>
        ) : (
          <>
            <p>{action.prompt}</p>
            {action.packPicks && Object.keys(action.packPicks).length > 1 && (
              <ul className="chips">
                {Object.entries(action.packPicks).map(([wolf, target]) => (
                  <li key={wolf}>
                    {nameOf(wolf)} → {target ? nameOf(target) : '…'}
                  </li>
                ))}
              </ul>
            )}
            <div className="box-actions">
              {/* The button is always there, so the table does not jump when a player is tapped. */}
              {choice && choice !== myPick ? (
                <Button onClick={() => api.nightAct(action.step, choice)}>
                  {action.verb} {nameOf(choice)}
                </Button>
              ) : (
                <Button disabled>
                  {myPick
                    ? `Proposto: ${nameOf(myPick)}. In attesa del branco…`
                    : action.targets.length > 0
                      ? 'Tocca un giocatore nel cerchio'
                      : 'Nessuno da scegliere'}
                </Button>
              )}
              {action.canSkip && (
                <Button variant="ghost" onClick={() => api.nightAct(action.step, null)}>
                  {action.skipLabel}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    );
  } else if (phase === 'night' && nStep) {
    const undecided = !nStep.fake && !nStep.decided && nStep.kind !== 'info';
    const nextLabel = nStep.isLast ? 'Fine della notte' : 'Chiama il prossimo ruolo';
    box = (
      <div className="box box-action">
        <p className="box-title">
          {nStep.title}
          <span className="box-who">
            {nStep.fake ? 'nessuno' : nStep.actorIds.map(nameOf).join(', ')}
          </span>
        </p>
        {nStep.hint && <p className={nStep.decided || nStep.kind === 'info' ? 'box-result' : ''}>{nStep.hint}</p>}
        {nStep.packPicks && !nStep.decided && Object.values(nStep.packPicks).some(Boolean) && (
          <ul className="chips">
            {Object.entries(nStep.packPicks).map(([wolf, target]) => (
              <li key={wolf}>
                {nameOf(wolf)} → {target ? nameOf(target) : '…'}
              </li>
            ))}
          </ul>
        )}
        <div className="box-actions">
          {undecided && (
            <Button disabled={!choice} onClick={() => choice && api.narratorAct(nStep.id, choice)}>
              {choice ? `Conferma: ${nameOf(choice)}` : 'Tocca il giocatore indicato'}
            </Button>
          )}
          {undecided ? (
            <ConfirmButton
              key={nStep.id}
              confirmLabel="Il ruolo non ha agito: tocca ancora per proseguire"
              onConfirm={() => api.narratorNext(nStep.id)}
            >
              {nextLabel}
            </ConfirmButton>
          ) : (
            <Button onClick={() => api.narratorNext(nStep.id)}>{nextLabel}</Button>
          )}
        </div>
      </div>
    );
  } else if (isGhost && phase !== 'ended' && phase !== 'voting' && phase !== 'verdict') {
    box = (
      <div className="box box-ghost">
        <p>Sei un fantasma: osserva in silenzio. Non puoi più votare né rivelare la tua carta.</p>
      </div>
    );
  } else if (phase === 'night') {
    box = (
      <div className="box">
        <p className="muted">
          {view.settings.audio === 'off'
            ? 'Il villaggio dorme. Tieni d’occhio lo schermo: se viene chiamato il tuo ruolo, tocca a te.'
            : 'Chiudi gli occhi e ascolta il narratore: aprili solo quando chiama il tuo ruolo, e richiudili quando lo congeda.'}
        </p>
      </div>
    );
  } else if (phase === 'voting' && vote) {
    box = (
      <div className="box">
        {mode === 'vote' ? (
          <p>
            {vote.myVote
              ? `Hai votato ${nameOf(vote.myVote)}. Tocca un altro giocatore per cambiare, o lo stesso per ritirare il voto.`
              : 'Tocca il giocatore che vuoi lapidare.'}
          </p>
        ) : isGhost ? (
          <p className="muted">Sei un fantasma: i morti non votano.</p>
        ) : isNarrator ? (
          <p className="muted">Chiudi la votazione quando tutti hanno scelto.</p>
        ) : (
          <p className="muted">Sei tra gli indiziati: in questo ballottaggio non voti.</p>
        )}
        {vote.ballots && (
          <ul className="chips chips-fixed">
            {Object.entries(vote.ballots).map(([voter, target]) => (
              <li key={voter}>
                {nameOf(voter)} → {nameOf(target)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  } else if (phase === 'verdict' && view.lastVote) {
    const result = view.lastVote;
    const ranked = Object.entries(result.tally)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    box =
      ranked.length > 0 ? (
        <div className="box">
          <ul className="chips">
            {result.ballots
              ? Object.entries(result.ballots).map(([voter, target]) => (
                  <li key={voter}>
                    {nameOf(voter)} → {nameOf(target)}
                  </li>
                ))
              : ranked.map(([id, n]) => (
                  <li key={id}>
                    {nameOf(id)}: {n} {n === 1 ? 'voto' : 'voti'}
                  </li>
                ))}
          </ul>
        </div>
      ) : null;
  }

  // ── The master's button ──
  let control: ReactNode = null;
  if (isDriver) {
    const go = (label: string) => <Button onClick={() => api.advance(phase)}>{label}</Button>;
    if (phase === 'setup') {
      control =
        seen < seats.length ? (
          <ConfirmButton
            variant="primary"
            confirmLabel="Non tutti hanno visto la carta: tocca ancora"
            onConfirm={() => api.advance(phase)}
          >
            Cala la notte
          </ConfirmButton>
        ) : (
          go('Cala la notte')
        );
    } else if (phase === 'dawn') control = go('Apri la discussione');
    else if (phase === 'discussion') control = go('Apri la votazione');
    else if (phase === 'voting' && vote) {
      const everyone = vote.voted.length >= vote.voters.length;
      control = everyone ? (
        go('Chiudi la votazione')
      ) : (
        <ConfirmButton
          key={vote.round}
          variant="primary"
          confirmLabel="Non tutti hanno votato: tocca ancora"
          onConfirm={() => api.advance(phase)}
        >
          Chiudi la votazione ({vote.voted.length}/{vote.voters.length})
        </ConfirmButton>
      );
    } else if (phase === 'verdict') control = go('Cala la notte');
  } else if (phase !== 'night' && phase !== 'ended') {
    control = <p className="waiting">In attesa del {view.narratorId ? 'narratore' : 'master'}…</p>;
  }

  const lastLine = view.narration[view.narration.length - 1];
  const canClaim = !isHost && view.hostOfflineSince !== null && now - view.hostOfflineSince >= view.hostClaimAfter;
  // Only a narrator cannot be replaced mid-game (it would reveal every role): the game stops instead.
  const hostNarrates = view.narratorId !== null && view.narratorId === view.hostId;
  const showReveal = phase === 'setup' && !!me && !!you && !you.seenCard;

  return (
    <div className={`game scene-${scene}`}>
      {SCENES.map((s) => (
        <div
          key={s}
          className={`game-bg ${s === scene ? 'is-on' : ''}`}
          style={{ backgroundImage: `url(${backgroundUrl(s)})` }}
        />
      ))}
      <div className="game-veil" />

      <div className="game-frame">
        <header className="topbar">
          <button type="button" className="icon-btn" onClick={() => setModal('menu')} aria-label="Menu">
            ☰
          </button>
          <button type="button" className="icon-btn" onClick={() => setModal('rules')} aria-label="Regolamento">
            i
          </button>
          <div className="topbar-info">
            <span className="topbar-code">{view.roomCode}</span>
            {view.narratorId && <span>Narratore: {nameOf(view.narratorId)}</span>}
          </div>
          {me ? (
            <button type="button" className="corner-card" onClick={() => setModal('role')} aria-label="La tua carta">
              <CardBack />
            </button>
          ) : (
            isNarrator && (
              <button type="button" className="corner-journal" onClick={() => setModal('journal')}>
                Registro
              </button>
            )
          )}
        </header>

        {canClaim && phase !== 'ended' && (
          <div className="parchment banner">
            <p>{hostNarrates ? 'Il narratore è disconnesso.' : 'Il master è disconnesso.'}</p>
            {hostNarrates ? (
              <ConfirmButton confirmLabel="Tocca ancora: la partita si interrompe" onConfirm={api.claimHost}>
                Interrompi la partita
              </ConfirmButton>
            ) : (
              <Button onClick={api.claimHost}>Diventa il master</Button>
            )}
          </div>
        )}

        <main className="table">
          <PlayerCircle seats={seats} youId={view.youId} hostId={view.hostId} states={states} onTap={onTap}>
            <span className={`emblem emblem-${scene}`} aria-hidden="true" />
            <h1 className="center-title">{title}</h1>
            {subtitle && <p className="center-sub">{subtitle}</p>}
          </PlayerCircle>
        </main>

        <footer className="footer">
          {box}
          <button type="button" className="scroll parchment" onClick={() => setModal('history')}>
            <span className="scroll-label">Il narratore</span>
            {lastLine && (
              <span className="scroll-text" key={lastLine.id}>
                {lastLine.text}
              </span>
            )}
          </button>
          {control && <div className="control">{control}</div>}
        </footer>
      </div>

      {showReveal && me && <RoleReveal role={me.role} onDone={api.seenCard} />}
      {phase === 'ended' && view.gameOver && <GameOver view={view} />}

      {modal === 'role' && me && <RoleModal view={view} onClose={() => setModal(null)} />}
      {modal === 'rules' && <RulesModal view={view} onClose={() => setModal(null)} />}
      {modal === 'history' && <HistoryModal view={view} onClose={() => setModal(null)} />}
      {modal === 'journal' && <JournalModal view={view} onClose={() => setModal(null)} />}
      {modal === 'menu' && <MenuModal view={view} onClose={() => setModal(null)} onOpen={setModal} />}
    </div>
  );
}
