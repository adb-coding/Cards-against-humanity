import type { PolicyType } from 'shared';
import { policyCardImg } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  policies: PolicyType[];
  onAcknowledge: () => void;
}

export function PolicyPeekModal({ policies, onAcknowledge }: Props) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Policy peek">
        <div className={styles.title}>Policy Peek</div>
        <div className={styles.subtitle}>The next 3 policies in the deck, top card first. Only you can see them.</div>
        <div className={styles.policyCards}>
          {policies.map((policy, i) => (
            <img key={i} src={policyCardImg(policy)} alt={`${policy} policy`} className={styles.policyCardStatic} />
          ))}
        </div>
        <div className={styles.btnRow}>
          <button className={styles.btnPrimary} onClick={onAcknowledge}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
