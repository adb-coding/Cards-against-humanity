import type { GameOverPayload } from 'shared';
import { asset, playerRoleIcon, ROLE_LABELS } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

const WIN_LABELS: Record<string, string> = {
  'liberal-policies': '5 Liberal policies were enacted.',
  'fascist-policies': '6 Fascist policies were enacted.',
  'hitler-assassinated': 'Hitler was executed.',
  'hitler-chancellor': 'Hitler was elected Chancellor.',
};

interface Props {
  data: GameOverPayload;
  myId: string;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function GameOverOverlay({ data, myId, isHost, onPlayAgain, onLeave }: Props) {
  const me = data.players.find((p) => p.id === myId);
  const iWon = me?.team === data.winningTeam;

  return (
    <div className={styles.backdrop}>
      <div className={`${styles.modal} ${styles.gameOverModal}`} role="dialog" aria-modal="true" aria-label="Game over">
        <img
          src={asset(`victory-${data.winningTeam}-header.png`)}
          alt={`${data.winningTeam} victory`}
          className={styles.victoryHeader}
        />
        <div className={styles.subtitle}>
          {WIN_LABELS[data.winCondition]}
          {me && <> <b className={iWon ? styles.passed : styles.failed}>{iWon ? 'You won!' : 'You lost.'}</b></>}
        </div>
        <ul className={styles.roleRevealList}>
          {data.players.map((p) => (
            <li
              key={p.id}
              className={`${styles.roleRevealEntry} ${styles[p.team]} ${!p.isAlive ? styles.dead : ''}`}
            >
              <img src={playerRoleIcon(p.role)} alt="" className={styles.roleRevealIcon} />
              <span className={styles.roleRevealText}>
                <strong>
                  {p.name}
                  {p.id === myId && <span className={styles.youTag}>You</span>}
                </strong>
                <span>{ROLE_LABELS[p.role]}{!p.isAlive && ' · executed'}</span>
              </span>
            </li>
          ))}
        </ul>
        <img
          src={asset(`victory-${data.winningTeam}-footer.png`)}
          alt=""
          className={styles.victoryFooter}
        />
        <div className={styles.btnRow}>
          {isHost && (
            <button className={styles.btnPrimary} onClick={onPlayAgain}>
              Play Again
            </button>
          )}
          <button className={styles.btnSecondary} onClick={onLeave}>
            Leave Room
          </button>
        </div>
        {!isHost && (
          <div className={styles.gameOverWaiting}>
            Waiting for the host to start a new game…
          </div>
        )}
      </div>
    </div>
  );
}
