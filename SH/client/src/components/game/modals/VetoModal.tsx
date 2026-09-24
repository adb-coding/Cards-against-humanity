import styles from '../../../styles/GameModals.module.css';

interface Props {
  onRespond: (response: 'accept' | 'reject') => void;
}

export function VetoModal({ onRespond }: Props) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.title}>Veto Requested</div>
        <div className={styles.subtitle}>
          The Chancellor wants to veto this agenda. Do you accept?
        </div>
        <div className={styles.btnRow}>
          <button className={styles.btnJa} onClick={() => onRespond('accept')}>
            Accept Veto
          </button>
          <button className={styles.btnNein} onClick={() => onRespond('reject')}>
            Reject Veto
          </button>
        </div>
      </div>
    </div>
  );
}
