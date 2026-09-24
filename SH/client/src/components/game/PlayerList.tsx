import type { BoardPlayer, GameBoardState, Role } from 'shared';
import { asset, playerRoleIcon, voteBubbleImg, ROLE_LABELS } from '../../lib/assets.js';
import styles from '../../styles/PlayerList.module.css';

interface Props {
  boardState: GameBoardState;
  myId: string;
  /** Roles that are public (only at game over), keyed by player id. */
  knownRoles: Record<string, Role>;
}

function VoteTag({ player, boardState }: { player: BoardPlayer; boardState: GameBoardState }) {
  if (!player.isAlive) return null;

  if (boardState.phase === 'election') {
    if (boardState.votedPlayerIds.includes(player.id)) {
      return <span className={styles.votedTag}>Voted</span>;
    }
    return <img src={asset('player-icon-busy.png')} alt="Still deciding" className={styles.voteBubble} />;
  }

  const vote = boardState.lastVotes?.[player.id];
  if (!vote) return null;
  return <img src={voteBubbleImg(vote)} alt={vote === 'ja' ? 'Voted Ja' : 'Voted Nein'} className={styles.voteBubble} />;
}

export function PlayerList({ boardState, myId, knownRoles }: Props) {
  return (
    <ul className={styles.grid} aria-label="Players">
      {boardState.players.map((p) => {
        const isMe = p.id === myId;
        const isCandidate = p.id === boardState.chancellorCandidateId && !p.isChancellor;
        const role = knownRoles[p.id];
        const classes = [
          styles.card,
          isMe && styles.me,
          p.isPresident && styles.president,
          (p.isChancellor || isCandidate) && styles.chancellor,
          !p.isAlive && styles.dead,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li key={p.id} className={classes}>
            <div className={styles.voteSlot}>
              <VoteTag player={p} boardState={boardState} />
            </div>
            <div className={styles.avatar}>
              {role ? (
                <img src={playerRoleIcon(role)} alt={ROLE_LABELS[role]} title={ROLE_LABELS[role]} />
              ) : (
                <span aria-hidden="true">{p.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className={styles.nameRow}>
              <span className={styles.name}>{p.name}</span>
              {isMe && <span className={styles.youTag}>You</span>}
            </div>
            <div className={styles.badges}>
              {p.isPresident && <span className={`${styles.badge} ${styles.presidentBadge}`}>President</span>}
              {p.isChancellor && <span className={`${styles.badge} ${styles.chancellorBadge}`}>Chancellor</span>}
              {isCandidate && <span className={`${styles.badge} ${styles.chancellorBadge}`}>Candidate</span>}
              {p.isTermLimited && p.isAlive && <span className={`${styles.badge} ${styles.mutedBadge}`}>Term-limited</span>}
              {!p.isAlive && <span className={`${styles.badge} ${styles.deadBadge}`}>Executed</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
