import type { BoardPlayer } from 'shared';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  players: BoardPlayer[];
  eligibleIds: string[];
  onNominate: (targetId: string) => void;
}

export function NominationModal({ players, eligibleIds, onNominate }: Props) {
  const eligible = players.filter((p) => eligibleIds.includes(p.id));

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.title}>Nominate Chancellor</div>
        <div className={styles.subtitle}>Pick your Chancellor candidate. Everyone will vote on this government.</div>
        <div className={styles.playerSelectList}>
          {eligible.map((p) => (
            <button
              key={p.id}
              className={styles.playerSelectBtn}
              onClick={() => onNominate(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
