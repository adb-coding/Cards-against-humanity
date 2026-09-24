import { useState } from 'react';
import { useGame } from '../context/GameContext.js';
import { DossierEnvelope } from '../components/DossierEnvelope.js';
import { PrivacyGate } from '../components/PrivacyGate.js';
import styles from '../styles/DossierReveal.module.css';

export function DossierReveal() {
  const { state, dispatch, dossierReady } = useGame();
  const [confirmed, setConfirmed] = useState(false);

  if (!state.dossier) {
    return (
      <div className={styles.container}>
        <p>Receiving your dossier…</p>
      </div>
    );
  }

  if (!confirmed) {
    return (
      <div className={styles.container}>
        <PrivacyGate onConfirm={() => setConfirmed(true)} confirmLabel="Open my dossier" />
      </div>
    );
  }

  return (
    <DossierEnvelope
      dossier={state.dossier}
      onProceed={() => {
        dossierReady();
        dispatch({ type: 'ENTER_GAME_BOARD' });
      }}
    />
  );
}
