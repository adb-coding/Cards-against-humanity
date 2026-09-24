import { useState, useEffect } from 'react';
import type { BoardPlayer, InvestigationPayload } from 'shared';
import { asset, partyCardImg } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  players: BoardPlayer[];
  presidentId: string;
  investigationResult: InvestigationPayload | null;
  onInvestigate: (targetId: string) => void;
  onDismiss: () => void;
}

export function InvestigationModal({
  players,
  presidentId,
  investigationResult,
  onInvestigate,
  onDismiss,
}: Props) {
  const [selected, setSelected] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    if (!investigationResult || !selected) return;

    const flipTimer = setTimeout(() => setFlipped(true), 900);
    const btnTimer = setTimeout(() => setShowContinue(true), 1800);
    return () => {
      clearTimeout(flipTimer);
      clearTimeout(btnTimer);
    };
  }, [investigationResult, selected]);

  // — Result screen: card flip reveal —
  if (investigationResult && selected) {
    const faceImg = partyCardImg(investigationResult.team);

    return (
      <div className={styles.backdrop}>
        <div className={styles.modal}>
          <div className={styles.title}>Party Membership</div>
          <div className={styles.subtitle}>
            {investigationResult.targetName}'s card reveals...
          </div>
          <div className={styles.investigationCards}>
            {/* Party membership card flips to reveal the team */}
            <div className={styles.cardFlipWrapper}>
              <div className={`${styles.membershipCard} ${flipped ? styles.membershipCardFlipped : ''}`}>
                <div className={styles.membershipCardBack}>
                  <img src={asset('party-membership.png')} alt="Party card back" className={styles.membershipCardImg} />
                </div>
                <div className={styles.membershipCardFront}>
                  <img src={faceImg} alt={`${investigationResult.team} party`} className={styles.membershipCardImg} />
                </div>
              </div>
            </div>
          </div>

          {flipped && (
            <div className={styles.subtitle}>
              {investigationResult.targetName} belongs to the{' '}
              <b className={investigationResult.team === 'liberal' ? styles.liberalText : styles.fascistText}>
                {investigationResult.team === 'liberal' ? 'Liberal' : 'Fascist'}
              </b>{' '}
              party. Only you know this.
            </div>
          )}

          {showContinue && (
            <div className={styles.btnRow}>
              <button className={styles.btnPrimary} onClick={onDismiss}>
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // — Player selection screen —
  const eligible = players.filter(
    (p) => p.isAlive && p.id !== presidentId && !p.hasBeenInvestigated
  );

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.title}>Investigate Loyalty</div>
        <div className={styles.subtitle}>Choose a player to investigate</div>
        <div className={styles.playerSelectList}>
          {eligible.map((p) => (
            <button
              key={p.id}
              className={styles.playerSelectBtn}
              onClick={() => {
                setSelected(true);
                onInvestigate(p.id);
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
