import type { PolicyType } from 'shared';
import { policyCardImg } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  policies: PolicyType[];
  canVeto: boolean;
  onEnact: (index: number) => void;
  onRequestVeto: () => void;
}

export function ChancellorLegislativeModal({ policies, canVeto, onEnact, onRequestVeto }: Props) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Legislative session">
        <div className={styles.title}>Legislative Session</div>
        <div className={styles.subtitle}>
          Tap a policy to <b>enact</b> it. The other one is discarded.
        </div>
        <div className={styles.policyCards}>
          {policies.map((policy, i) => (
            <button key={i} type="button" className={styles.policyBtn} onClick={() => onEnact(i)}>
              <img src={policyCardImg(policy)} alt={`Enact ${policy} policy`} className={styles.policyCardImg} />
              <span className={styles.policyAction}>Enact</span>
            </button>
          ))}
        </div>
        {canVeto && (
          <div className={styles.btnRow}>
            <button className={styles.btnVeto} onClick={onRequestVeto}>
              Request Veto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
