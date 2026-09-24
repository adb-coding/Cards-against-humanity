import { useCallback, useEffect, useState } from 'react';
import socket from '../../socket.js';
import BlackCard from './BlackCard.jsx';
import PlayerHand from './PlayerHand.jsx';
import PlayerStrip from './PlayerStrip.jsx';
import AnswerGrid from './AnswerGrid.jsx';
import RoundResult from './RoundResult.jsx';

const PHASE_LABELS = {
  playing: 'Picking cards',
  reading: 'Czar is reading',
  judging: 'Judging',
  scoring: 'Round over',
  ended: 'Game over',
};

export default function GameScreen({ gameState, onSubmit }) {
  const {
    phase,
    playerId,
    hostId,
    czarId,
    currentBlackCard,
    myHand,
    redrawsLeft,
    handVersion,
    submittedIds,
    totalNeeded,
    mySubmission,
    submissions,
    submissionCount,
    revealed,
    winningSubmissionId,
    authors,
    roundWinner,
    skipReason,
    scores,
    players,
    roundNumber,
    gameWinner,
  } = gameState;

  const [focusId, setFocusId] = useState(null);
  const [handPreview, setHandPreview] = useState([]);

  // Reset local selection whenever the phase or round changes
  useEffect(() => {
    setFocusId(null);
  }, [phase, roundNumber]);

  const onPreview = useCallback((texts) => setHandPreview(texts), []);

  const isCzar = playerId === czarId;
  const isHost = playerId === hostId;
  const hasSubmitted = submittedIds.includes(playerId);
  const me = players.find((p) => p.id === playerId);
  const czar = players.find((p) => p.id === czarId);
  const czarName = isCzar ? 'You' : czar?.name ?? 'The Czar';

  // What the black card shows written into its blanks
  const focused = submissions.find((s) => s.submissionId === focusId);
  const winning = submissions.find((s) => s.submissionId === winningSubmissionId);
  let answers = null;
  if (phase === 'playing' && !isCzar) answers = hasSubmitted ? mySubmission?.map((c) => c.text) : handPreview;
  else if ((phase === 'reading' || phase === 'judging') && focused) answers = focused.cards.map((c) => c.text);
  else if ((phase === 'scoring' || phase === 'ended') && winning) answers = winning.cards.map((c) => c.text);

  const doneCount = submittedIds.length;
  const needed = totalNeeded || Math.max(players.length - 1, 0);

  let status;
  switch (phase) {
    case 'playing':
      status = isCzar
        ? `You're the Card Czar this round. ${doneCount}/${needed} players done.`
        : hasSubmitted
          ? `Card played! Waiting for the others · ${doneCount}/${needed} done`
          : `${doneCount}/${needed} players done`;
      break;
    case 'reading':
      status = isCzar
        ? `Tap each card to read it out loud · ${revealed.length}/${submissionCount} read`
        : `${czarName} is reading the answers… · ${revealed.length}/${submissionCount} read`;
      break;
    case 'judging':
      status = isCzar ? 'Pick your favourite answer' : `${czarName} is choosing the winner…`;
      break;
    case 'scoring':
      status = skipReason
        ? `Round skipped: ${skipReason}`
        : roundWinner?.id === playerId
          ? 'Your card won this round! +1 point'
          : `${roundWinner?.name} wins the round!`;
      break;
    default:
      status = '';
  }

  // Bottom action bar (the hand renders its own while picking)
  let action = null;
  if (phase === 'playing' && isCzar) {
    action = <p className="action-note">Relax, Czar. The answers are on their way.</p>;
  } else if (phase === 'playing' && hasSubmitted) {
    action = <p className="action-note">Waiting for {needed - doneCount} more player{needed - doneCount === 1 ? '' : 's'}…</p>;
  } else if (phase === 'reading') {
    action = isCzar ? (
      <button
        className="btn btn--primary btn--block"
        disabled={revealed.length < submissionCount}
        onClick={() => socket.emit('game:czarContinue')}
      >
        {revealed.length < submissionCount ? `Read all cards first (${revealed.length}/${submissionCount})` : 'Show everyone →'}
      </button>
    ) : (
      <p className="action-note">The answers will appear once the Czar has read them.</p>
    );
  } else if (phase === 'judging') {
    action = isCzar ? (
      <button
        className="btn btn--primary btn--block"
        disabled={focusId === null}
        onClick={() => socket.emit('game:judgeWinner', { submissionId: focusId })}
      >
        {focusId === null ? 'Tap a card to choose' : '♛ Crown this card'}
      </button>
    ) : (
      <p className="action-note">Tap a card to try it in the sentence.</p>
    );
  } else if (phase === 'scoring') {
    action = isHost ? (
      <button className="btn btn--primary btn--block" onClick={() => socket.emit('game:nextRound')}>
        Next round →
      </button>
    ) : (
      <p className="action-note">Waiting for the host to start the next round…</p>
    );
  }

  return (
    <div className="screen screen--game">
      <header className="topbar">
        <div className="topbar-round">
          <span className="topbar-num">Round {roundNumber}</span>
          <span className="topbar-phase">{PHASE_LABELS[phase] ?? phase}</span>
        </div>
        <div className="me-chip">
          <span className="me-name">{me?.name}</span>
          <span className="tag tag--you">You</span>
          {isCzar && <span className="tag tag--czar">Czar</span>}
          <span className="me-score">{scores[playerId] ?? 0}<small>pt</small></span>
        </div>
      </header>

      <PlayerStrip
        players={players}
        scores={scores}
        czarId={czarId}
        playerId={playerId}
        phase={phase}
        submittedIds={submittedIds}
        winnerId={roundWinner?.id}
      />

      <main className="table">
        <div className="prompt" key={`${roundNumber}-${currentBlackCard?.id}`}>
          <BlackCard card={currentBlackCard} answers={answers} />
        </div>

        {status && <p className={`status status--${phase}`} aria-live="polite">{status}</p>}

        {phase === 'playing' && !isCzar && !hasSubmitted && (
          <PlayerHand
            hand={myHand}
            blackCard={currentBlackCard}
            redrawsLeft={redrawsLeft}
            handVersion={handVersion}
            onSubmit={onSubmit}
            onPreview={onPreview}
          />
        )}

        {phase === 'playing' && !isCzar && hasSubmitted && mySubmission && (
          <div className="answers">
            <div className="wcard wcard--answer wcard--played">
              {mySubmission.map((c) => (
                <span key={c.id} className="answer-line">{c.text}</span>
              ))}
            </div>
          </div>
        )}

        {phase === 'playing' && isCzar && (
          <div className="czar-wait">
            <span className="czar-crown" aria-hidden="true">♛</span>
            <div className="czar-slots">
              {Array.from({ length: needed }, (_, i) => (
                <span key={i} className={`czar-slot ${i < doneCount ? 'is-in' : ''}`} />
              ))}
            </div>
          </div>
        )}

        {(phase === 'reading' || phase === 'judging' || ((phase === 'scoring' || phase === 'ended') && submissions.length > 0)) && (
          <AnswerGrid
            key={phase === 'reading' ? 'reading' : 'reveal'}
            phase={phase}
            isCzar={isCzar}
            count={submissionCount}
            submissions={submissions}
            revealed={revealed}
            focusId={focusId}
            onFocus={setFocusId}
            mySubmission={mySubmission}
            winningSubmissionId={winningSubmissionId}
            authors={authors}
          />
        )}
      </main>

      {action && <div className="action-bar">{action}</div>}

      {phase === 'ended' && (
        <RoundResult players={players} scores={scores} playerId={playerId} hostId={hostId} gameWinner={gameWinner} />
      )}
    </div>
  );
}
