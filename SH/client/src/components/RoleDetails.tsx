import type { DossierRevealPayload } from 'shared';
import { partyCardImg, roleCardImg, ROLE_LABELS } from '../lib/assets.js';
import styles from '../styles/RoleDetails.module.css';

interface Props {
  dossier: DossierRevealPayload;
}

/** Secret role card, party membership card and whatever the player is allowed to know. */
export function RoleDetails({ dossier }: Props) {
  const { you, knownFascists, knownHitler } = dossier;
  const teamClass = you.team === 'liberal' ? styles.liberal : styles.fascist;

  return (
    <div className={styles.wrap}>
      <div className={styles.cards}>
        <img
          src={roleCardImg(you.role, you.name)}
          alt={`Secret role: ${ROLE_LABELS[you.role]}`}
          className={styles.roleCard}
        />
        <img
          src={partyCardImg(you.team)}
          alt={`Party membership: ${you.team}`}
          className={styles.partyCard}
        />
      </div>

      <p className={styles.summary}>
        You are <b className={teamClass}>{ROLE_LABELS[you.role]}</b>
        {you.role !== 'liberal' && <> — a member of the <b className={teamClass}>Fascist</b> party</>}.
      </p>

      {you.role === 'liberal' && (
        <p className={styles.note}>Find and stop the Fascists. Trust no one.</p>
      )}

      {(knownFascists.length > 0 || knownHitler) && (
        <div className={styles.intel}>
          {knownFascists.length > 0 && (
            <div>
              <div className={styles.intelHeading}>
                {you.role === 'hitler' ? 'Your Fascist' : 'Fellow Fascists'}
              </div>
              <div className={styles.intelNames}>{knownFascists.join(', ')}</div>
            </div>
          )}
          {knownHitler && (
            <div>
              <div className={styles.intelHeading}>Hitler</div>
              <div className={styles.intelNames}>{knownHitler}</div>
            </div>
          )}
        </div>
      )}

      {you.role === 'hitler' && knownFascists.length === 0 && (
        <p className={styles.note}>You do not know who your Fascists are. They know you.</p>
      )}
    </div>
  );
}
