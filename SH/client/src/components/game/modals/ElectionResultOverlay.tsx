import { useEffect } from 'react';
import type { ElectionResult, BoardPlayer } from 'shared';
import { voteBubbleImg } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  result: ElectionResult;
  players: BoardPlayer[];
  myId: string;
  onDismiss: () => void;
}

export function ElectionResultOverlay({ result, players, myId, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const voters = players.filter((p) => result.votes[p.id]);
  const ja = voters.filter((p) => result.votes[p.id] === 'ja').length;
  const nein = voters.length - ja;
  const chancellor = players.find((p) => p.id === result.chancellorId)?.name ?? '???';

  return (
    <div className={styles.backdrop} onClick={onDismiss}>
      <div className={styles.modal}>
        <div className={`${styles.title} ${result.passed ? styles.passed : styles.failed}`}>
          {result.passed ? 'Election passed' : 'Election failed'}
        </div>
        <div className={styles.subtitle}>
          {result.passed ? `${chancellor} is the new Chancellor.` : `${chancellor} was not elected.`}{' '}
          <b>{ja}</b> Ja · <b>{nein}</b> Nein
        </div>
        <ul className={styles.voteGrid}>
          {voters.map((p) => (
            <li key={p.id} className={styles.voteEntry}>
              <img
                src={voteBubbleImg(result.votes[p.id])}
                alt={result.votes[p.id] === 'ja' ? 'Ja' : 'Nein'}
                className={styles.voteBubble}
              />
              <span className={styles.voteName}>
                {p.name}
                {p.id === myId && <span className={styles.youTag}>You</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.tapHint}>Tap to continue</div>
      </div>
    </div>
  );
}
