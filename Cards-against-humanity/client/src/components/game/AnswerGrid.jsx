import socket from '../../socket.js';

function CardBack() {
  return (
    <span className="wcard-back">
      <span>Cards</span>
      <span>Against</span>
      <span>Humanity</span>
    </span>
  );
}

function AnswerFace({ cards, isMine }) {
  return (
    <span className="answer-face">
      {cards.map((c, i) => (
        <span key={c.id} className="answer-line">
          {cards.length > 1 && <span className="answer-num">{i + 1}</span>}
          {c.text}
        </span>
      ))}
      {isMine && <span className="answer-mine">Your card</span>}
    </span>
  );
}

/**
 * Anonymous answers, in three moods:
 * - reading: the Czar flips each card privately; everyone else sees face-down cards
 * - judging: every answer is dealt face-up to all players
 * - scoring: the winning answer is crowned and authors are revealed
 */
export default function AnswerGrid({
  phase,
  isCzar,
  count,
  submissions,
  revealed,
  focusId,
  onFocus,
  mySubmission,
  winningSubmissionId,
  authors,
}) {
  const myIds = new Set((mySubmission ?? []).map((c) => c.id));
  const isMine = (sub) => sub.cards.some((c) => myIds.has(c.id));

  if (phase === 'reading') {
    const slots = Array.from({ length: count }, (_, i) => submissions.find((s) => s.submissionId === i) ?? { submissionId: i });
    return (
      <div className="answers answers--reading">
        {slots.map((sub, i) => {
          const isRead = revealed.includes(sub.submissionId);
          if (!isCzar) {
            return (
              <div key={i} className={`flip ${isRead ? 'is-peeked' : ''}`} style={{ '--i': i }}>
                <div className="flip-inner">
                  <div className="flip-face flip-face--back"><CardBack /></div>
                </div>
                {isRead && <span className="read-mark">Read</span>}
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              className={`flip ${isRead ? 'is-flipped' : ''} ${focusId === sub.submissionId ? 'is-focus' : ''}`}
              style={{ '--i': i }}
              onClick={() => {
                if (!isRead) socket.emit('game:czarReveal', { submissionId: sub.submissionId });
                onFocus(sub.submissionId);
              }}
              aria-label={isRead ? 'Answer' : `Flip answer ${i + 1}`}
            >
              <div className="flip-inner">
                <div className="flip-face flip-face--back"><CardBack /></div>
                <div className="flip-face flip-face--front">{sub.cards && <AnswerFace cards={sub.cards} />}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  const authorOf = (id) => authors.find((a) => a.submissionId === id)?.name;
  const scoring = phase === 'scoring' || phase === 'ended';

  return (
    <div className={`answers answers--${scoring ? 'scoring' : 'judging'}`}>
      {submissions.map((sub, i) => {
        const won = scoring && sub.submissionId === winningSubmissionId;
        const classes = [
          'wcard',
          'wcard--answer',
          focusId === sub.submissionId && !scoring ? 'is-selected' : '',
          won ? 'is-winner' : '',
          scoring && !won ? 'is-loser' : '',
        ].join(' ');
        return (
          <div key={sub.submissionId} className="answer-slot" style={{ '--i': i }}>
            <button
              type="button"
              className={classes}
              onClick={() => !scoring && onFocus(sub.submissionId)}
              disabled={scoring}
            >
              {won && <span className="crown" aria-hidden="true">♛</span>}
              <AnswerFace cards={sub.cards} isMine={isMine(sub)} />
            </button>
            {scoring && <span className={`author ${won ? 'author--winner' : ''}`}>{authorOf(sub.submissionId)}</span>}
          </div>
        );
      })}
    </div>
  );
}
