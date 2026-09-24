import { useEffect, useState } from 'react';
import type { DossierRevealPayload } from 'shared';
import { RoleDetails } from './RoleDetails.js';
import styles from '../styles/DossierReveal.module.css';

interface Props {
  dossier: DossierRevealPayload;
  onProceed: () => void;
}

export function DossierEnvelope({ dossier, onProceed }: Props) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1500),   // stamp visible
      setTimeout(() => setPhase(2), 3000),    // envelope arrived
      setTimeout(() => setPhase(3), 3500),    // flap opens
      setTimeout(() => setPhase(4), 5000),    // card revealed
      setTimeout(() => setPhase(5), 6000),    // proceed button
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={styles.container}>
      {/* Phase 1: CLASSIFIED stamp */}
      <div className={styles.stamp}>CLASSIFIED</div>

      {/* Phase 2-3: Envelope */}
      {phase >= 1 && (
        <div className={styles.envelope}>
          <div className={`${styles.flap} ${phase >= 3 ? styles.flapOpen : ''}`} />

          {/* Phase 4: Card */}
          {phase >= 4 && (
            <div className={styles.card}>
              <RoleDetails dossier={dossier} />
            </div>
          )}
        </div>
      )}

      {/* Phase 5: Proceed */}
      {phase >= 5 && (
        <div className={styles.proceedWrap}>
          <button className={styles.proceed} onClick={onProceed}>
            I have read my dossier
          </button>
        </div>
      )}
    </div>
  );
}
