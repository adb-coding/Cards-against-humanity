export default function PlayerStrip({ players, scores, czarId, playerId, phase, submittedIds, winnerId }) {
  const status = (p) => {
    if (p.id === czarId) return { cls: 'czar', label: phase === 'reading' ? 'Reading' : phase === 'judging' ? 'Judging' : 'Czar' };
    if (phase === 'playing') {
      return submittedIds.includes(p.id) ? { cls: 'done', label: 'Done' } : { cls: 'busy', label: 'Picking' };
    }
    if (phase === 'scoring' && p.id === winnerId) return { cls: 'winner', label: '+1' };
    return null;
  };

  return (
    <ul className="strip" aria-label="Players">
      {players.map((p) => {
        const s = status(p);
        return (
          <li key={p.id} className={`chip ${p.id === playerId ? 'is-me' : ''} ${s ? `chip--${s.cls}` : ''}`}>
            <span className="chip-top">
              <span className="chip-name">{p.name}</span>
              {p.id === playerId && <span className="tag tag--you">You</span>}
            </span>
            <span className="chip-bottom">
              <span className="chip-score">{scores[p.id] ?? 0}<small>pt</small></span>
              {s && (
                <span className={`chip-status chip-status--${s.cls}`}>
                  {s.cls === 'busy' ? (
                    <span className="dots" aria-label="Picking"><i /><i /><i /></span>
                  ) : s.cls === 'done' ? (
                    <>✓ {s.label}</>
                  ) : s.cls === 'czar' ? (
                    <>♛ {s.label}</>
                  ) : (
                    s.label
                  )}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
