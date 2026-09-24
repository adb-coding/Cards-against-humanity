import type { BoardPlayer } from 'shared';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  players: BoardPlayer[];
  presidentId: string;
  onSelect: (targetId: string) => void;
}

export function SpecialElectionModal({ players, presidentId, onSelect }: Props) {
  const eligible = players.filter((p) => p.isAlive && p.id !== presidentId);

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.title}>Special Election</div>
        <div className={styles.subtitle}>Choose who will be the next President. Afterwards, the normal order resumes.</div>
        <div className={styles.playerSelectList}>
          {eligible.map((p) => (
            <button
              key={p.id}
              className={styles.playerSelectBtn}
              onClick={() => onSelect(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
