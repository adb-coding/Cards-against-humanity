import { LIBERAL_POLICIES_TO_WIN } from 'shared';
import { asset, policyCardImg } from '../../lib/assets.js';
import styles from '../../styles/Board.module.css';

interface Props {
  liberalPolicies: number;
  electionTracker: number;
}

// Slot centres measured on board-liberal.png (1683x650), as % of the image.
const SLOT_X = [23.2, 36.65, 50.2, 63.7, 77.3];
const SLOT_Y = 48.6;
// Election tracker circles: start, fail 1, fail 2, fail 3.
const TRACKER_X = [35.65, 44.85, 54.05, 63.3];
const TRACKER_Y = 79.85;

export function LiberalBoard({ liberalPolicies, electionTracker }: Props) {
  const trackerPos = Math.min(electionTracker, TRACKER_X.length - 1);

  return (
    <figure className={styles.board} aria-label={`Liberal board: ${liberalPolicies} of ${LIBERAL_POLICIES_TO_WIN} policies`}>
      <img src={asset('board-liberal.png')} alt="" className={styles.boardImg} />
      {SLOT_X.slice(0, liberalPolicies).map((x, i) => (
        <img
          key={i}
          src={policyCardImg('liberal')}
          alt="Liberal policy"
          className={styles.policyCard}
          style={{ left: `${x}%`, top: `${SLOT_Y}%` }}
        />
      ))}
      <img
        src={asset('board-tracker.png')}
        alt={`Election tracker: ${electionTracker} failed`}
        className={styles.tracker}
        style={{ left: `${TRACKER_X[trackerPos]}%`, top: `${TRACKER_Y}%` }}
      />
    </figure>
  );
}
