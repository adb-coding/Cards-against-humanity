import socket from '../../socket.js';
import { MENU_URL } from '../../tableNight.js';

export default function RoundResult({ players, scores, playerId, hostId, gameWinner }) {
  const isHost = playerId === hostId;
  const ranking = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <div className="overlay">
      <div className="sheet sheet--gameover">
        <p className="eyebrow">Game over</p>
        <h2 className="gameover-title">
          {gameWinner?.id === playerId ? 'You win!' : `${gameWinner?.name} wins!`}
        </h2>
        <ol className="ranking">
          {ranking.map((p, i) => (
            <li key={p.id} className={`rank ${i === 0 ? 'rank--first' : ''}`} style={{ '--i': i }}>
              <span className="rank-pos">{i + 1}</span>
              <span className="rank-name">
                {p.name}
                {p.id === playerId && <span className="tag tag--you">You</span>}
              </span>
              <span className="rank-score">{scores[p.id] ?? 0}</span>
            </li>
          ))}
        </ol>
        <div className="stack">
          {isHost ? (
            <button className="btn btn--primary btn--block" onClick={() => socket.emit('game:playAgain')}>
              Play again
            </button>
          ) : (
            <p className="action-note">Waiting for the host to start a new game…</p>
          )}
          <a className="btn btn--link" href={MENU_URL}>Leave to menu</a>
        </div>
      </div>
    </div>
  );
}
