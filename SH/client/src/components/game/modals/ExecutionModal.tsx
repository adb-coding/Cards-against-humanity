import type { BoardPlayer } from 'shared';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  players: BoardPlayer[];
  presidentId: string;
  onExecute: (targetId: string) => void;
}

export function ExecutionModal({ players, presidentId, onExecute }: Props) {
  const eligible = players.filter((p) => p.isAlive && p.id !== presidentId);

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.title}>Execution</div>
        <div className={styles.subtitle}>Choose a player to execute. If they are Hitler, the Liberals win.</div>
        <div className={styles.playerSelectList}>
          {eligible.map((p) => (
            <button
              key={p.id}
              className={styles.btnDanger}
              
              onClick={() => onExecute(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
