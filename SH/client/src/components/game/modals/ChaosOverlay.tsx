import { useEffect } from 'react';
import type { PolicyType } from 'shared';
import { policyCardImg } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  enactedPolicy: PolicyType;
  slot: number;
  onDismiss: () => void;
}

export function ChaosOverlay({ enactedPolicy, slot, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={styles.backdrop} onClick={onDismiss}>
      <div className={styles.modal}>
        <div className={styles.chaosText}>Chaos!</div>
        <div className={styles.subtitle}>
          Three governments failed in a row. The country is thrown into chaos and the top policy is enacted.
        </div>
        <div className={styles.policyCards}>
          <img src={policyCardImg(enactedPolicy)} alt={`${enactedPolicy} policy`} className={`${styles.policyCardStatic} ${styles.dropIn}`} />
        </div>
        <div className={styles.subtitle}>
          A {enactedPolicy} policy was enacted (slot {slot}). Any power is ignored and term limits are reset.
        </div>
        <div className={styles.tapHint}>Tap to continue</div>
      </div>
    </div>
  );
}
