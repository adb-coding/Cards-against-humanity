import { useEffect, useState } from 'react';
import type { DossierRevealPayload } from 'shared';
import { RoleDetails } from '../../RoleDetails.js';
import { PrivacyGate } from '../../PrivacyGate.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  dossier: DossierRevealPayload;
  onClose: () => void;
}

/** Seconds the role stays on screen before hiding itself, in case the phone is put down. */
const AUTO_HIDE_SECONDS = 15;

export function MyRoleModal({ dossier, onClose }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);

  useEffect(() => {
    if (!confirmed) return;
    if (secondsLeft <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [confirmed, secondsLeft, onClose]);

  return (
    <div className={`${styles.backdrop} ${styles.backdropTop} ${styles.backdropOpaque}`} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.paperModal}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your secret role"
        onClick={(e) => e.stopPropagation()}
      >
        {!confirmed ? (
          <PrivacyGate onConfirm={() => setConfirmed(true)} onCancel={onClose} />
        ) : (
          <>
            <div className={styles.title}>Your secret role</div>
            <RoleDetails dossier={dossier} />
            <div className={styles.btnRow}>
              <button className={styles.btnPrimary} onClick={onClose}>
                Hide now ({secondsLeft}s)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
