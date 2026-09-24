import { useEffect } from 'react';
import type { PolicyType } from 'shared';
import { LIBERAL_POLICIES_TO_WIN, FASCIST_POLICIES_TO_WIN } from 'shared';
import { policyCardImg } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  policy: PolicyType;
  slot: number;
  onDismiss: () => void;
}

export function PolicyEnactedOverlay({ policy, slot, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const total = policy === 'liberal' ? LIBERAL_POLICIES_TO_WIN : FASCIST_POLICIES_TO_WIN;

  return (
    <div className={styles.backdrop} onClick={onDismiss}>
      <div className={styles.modal}>
        <div className={`${styles.title} ${policy === 'liberal' ? styles.liberalText : styles.fascistText}`}>
          {policy} policy enacted
        </div>
        <div className={styles.policyCards}>
          <img src={policyCardImg(policy)} alt={`${policy} policy`} className={`${styles.policyCardStatic} ${styles.dropIn}`} />
        </div>
        <div className={styles.subtitle}>
          {slot} of {total} {policy} policies on the board.
        </div>
        <div className={styles.tapHint}>Tap to continue</div>
      </div>
    </div>
  );
}
