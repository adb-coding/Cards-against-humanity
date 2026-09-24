import type { ExecutiveAction, GameBoardState } from 'shared';
import styles from '../../styles/PhaseIndicator.module.css';

interface Props {
  boardState: GameBoardState;
  myId: string;
}

const PHASE_LABELS: Record<string, string> = {
  'chancellor-nomination': 'Chancellor Nomination',
  'election': 'Election',
  'legislative-president': 'Legislative Session',
  'legislative-chancellor': 'Legislative Session',
  'veto-requested': 'Veto Requested',
  'policy-enacted': 'Policy Enacted',
  'executive-action': 'Executive Action',
  'game-over': 'Game Over',
};

export const EXECUTIVE_ACTION_LABELS: Record<ExecutiveAction, string> = {
  'none': 'None',
  'investigate-loyalty': 'Investigate Loyalty',
  'special-election': 'Call Special Election',
  'policy-peek': 'Policy Peek',
  'execution': 'Execution',
};

export function PhaseIndicator({ boardState, myId }: Props) {
  const nameOf = (id: string | null) => boardState.players.find((p) => p.id === id)?.name ?? '???';
  const presidentName = nameOf(boardState.presidentId);
  const isPresident = boardState.presidentId === myId;
  const isChancellor = boardState.chancellorId === myId;
  const action = boardState.executiveAction ? EXECUTIVE_ACTION_LABELS[boardState.executiveAction] : '';

  let subtext = '';
  let yourTurn = false;
  switch (boardState.phase) {
    case 'chancellor-nomination':
      yourTurn = isPresident;
      subtext = isPresident
        ? 'You are President. Nominate a Chancellor.'
        : `President ${presidentName} is nominating a Chancellor…`;
      break;
    case 'election': {
      const alive = boardState.players.filter((p) => p.isAlive).length;
      const voted = boardState.votedPlayerIds.length;
      const hasVoted = boardState.votedPlayerIds.includes(myId);
      yourTurn = !hasVoted && boardState.players.some((p) => p.id === myId && p.isAlive);
      subtext = `${presidentName} (President) + ${nameOf(boardState.chancellorCandidateId)} (Chancellor) · ${voted}/${alive} votes cast`;
      if (hasVoted) subtext += ' · waiting for the others';
      break;
    }
    case 'legislative-president':
      yourTurn = isPresident;
      subtext = isPresident
        ? 'You drew 3 policies. Discard one.'
        : `President ${presidentName} is reviewing policies…`;
      break;
    case 'legislative-chancellor':
      yourTurn = isChancellor;
      subtext = isChancellor
        ? 'Choose a policy to enact.'
        : `Chancellor ${nameOf(boardState.chancellorId)} is choosing a policy…`;
      break;
    case 'veto-requested':
      yourTurn = isPresident;
      subtext = isPresident
        ? 'The Chancellor requests a veto. Accept or reject?'
        : 'The Chancellor has requested a veto…';
      break;
    case 'executive-action':
      yourTurn = isPresident;
      subtext = isPresident
        ? `You must use your power: ${action}`
        : `President ${presidentName} is using a power: ${action}`;
      break;
    case 'game-over':
      subtext = 'The game has ended.';
      break;
  }

  return (
    <div className={`${styles.banner} ${yourTurn ? styles.yourTurn : ''}`} aria-live="polite">
      <div className={styles.label}>
        {PHASE_LABELS[boardState.phase] ?? boardState.phase}
        {yourTurn && <span className={styles.turnTag}>Your move</span>}
      </div>
      {subtext && <div className={styles.subtext}>{subtext}</div>}
    </div>
  );
}
