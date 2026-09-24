import type { PolicyType } from 'shared';
import { policyCardImg } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  policies: PolicyType[];
  onDiscard: (index: number) => void;
}

export function PresidentLegislativeModal({ policies, onDiscard }: Props) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Legislative session">
        <div className={styles.title}>Legislative Session</div>
        <div className={styles.subtitle}>
          Tap a policy to <b>discard</b> it. The other two go to the Chancellor.
        </div>
        <div className={styles.policyCards}>
          {policies.map((policy, i) => (
            <button key={i} type="button" className={styles.policyBtn} onClick={() => onDiscard(i)}>
              <img src={policyCardImg(policy)} alt={`Discard ${policy} policy`} className={styles.policyCardImg} />
              <span className={styles.policyAction}>Discard</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
