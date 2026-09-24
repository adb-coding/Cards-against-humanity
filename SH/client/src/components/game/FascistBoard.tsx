import { FASCIST_POLICIES_TO_WIN, getExecutiveActionTier } from 'shared';
import { asset, policyCardImg } from '../../lib/assets.js';
import styles from '../../styles/Board.module.css';

interface Props {
  fascistPolicies: number;
  playerCount: number;
}

// Slot centres measured on board-fascist-*.png (1683x650), as % of the image.
const SLOT_X = [16.2, 29.65, 43.2, 56.8, 70.45, 84.1];
const SLOT_Y = 48.9;

export function FascistBoard({ fascistPolicies, playerCount }: Props) {
  const tier = getExecutiveActionTier(playerCount);

  return (
    <figure className={styles.board} aria-label={`Fascist board: ${fascistPolicies} of ${FASCIST_POLICIES_TO_WIN} policies`}>
      <img src={asset(`board-fascist-${tier}.png`)} alt="" className={styles.boardImg} />
      {SLOT_X.slice(0, fascistPolicies).map((x, i) => (
        <img
          key={i}
          src={policyCardImg('fascist')}
          alt="Fascist policy"
          className={styles.policyCard}
          style={{ left: `${x}%`, top: `${SLOT_Y}%` }}
        />
      ))}
    </figure>
  );
}
