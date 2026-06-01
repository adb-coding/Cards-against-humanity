import BlackCard from './BlackCard.jsx';
import PlayerHand from './PlayerHand.jsx';
import SubmittedCards from './SubmittedCards.jsx';
import ScoreBoard from './ScoreBoard.jsx';
import RoundResult from './RoundResult.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function GameScreen({ gameState, onSubmitted, onExit }) {
  const {
    phase,
    playerId,
    hostId,
    czarId,
    currentBlackCard,
    myHand,
    submissions,
    submittedCount,
    totalNeeded,
    scores,
    players,
    roundWinner,
    roundNumber,
    hasSubmitted,
    gameWinner,
    maxRedraws,
    myRedraws,
  } = gameState;

  const isMobile = useIsMobile();
  const isCzar = playerId === czarId;
  const czarPlayer = players.find((p) => p.id === czarId);

  const mainStyle = isMobile
    ? { ...styles.main, flexDirection: 'column', padding: '12px 8px', gap: 16, alignItems: 'stretch' }
    : styles.main;

  const sidebarStyle = isMobile
    ? { ...styles.sidebar, width: '100%' }
    : styles.sidebar;

  const headerStyle = isMobile
    ? { ...styles.header, padding: '10px 12px' }
    : styles.header;

  const previewCardStyle = isMobile
    ? { ...styles.previewCard, width: 'calc(50% - 6px)' }
    : styles.previewCard;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={styles.headerLeft}>
          <span style={styles.roundBadge}>Round {roundNumber}</span>
          <span style={styles.phaseBadge}>{phase.toUpperCase()}</span>
        </div>
        <div style={styles.czarInfo}>
          <span style={styles.czarLabel}>Card Czar: </span>
          <span style={styles.czarName}>{czarPlayer?.name || '?'}</span>
          {isCzar && <span style={styles.youCzar}>(You!)</span>}
        </div>
        <button onClick={onExit} style={styles.exitBtn}>← Leave</button>
      </div>

      {/* Main area */}
      <div style={mainStyle}>
        {/* Scoreboard — top on mobile, left sidebar on desktop */}
        <aside style={sidebarStyle}>
          <ScoreBoard players={players} scores={scores} czarId={czarId} />
        </aside>

        {/* Center: Black card + game content */}
        <div style={styles.center}>
          <div style={styles.blackCardArea}>
            <BlackCard card={currentBlackCard} />
            {phase === 'playing' && (
              <div style={styles.progressBox}>
                <p style={styles.progressText}>
                  {submittedCount} / {totalNeeded} submitted
                </p>
                {isCzar && <p style={styles.czarWait}>You are the Card Czar — wait for others to submit.</p>}
              </div>
            )}
          </div>

          {/* Phase-specific content */}
          {phase === 'playing' && !isCzar && (
            <PlayerHand
              hand={myHand}
              blackCard={currentBlackCard}
              hasSubmitted={hasSubmitted}
              onSubmitted={onSubmitted}
              maxRedraws={maxRedraws}
              myRedraws={myRedraws}
            />
          )}

          {(phase === 'judging') && (
            <div style={styles.judgingArea}>
              {isCzar ? (
                <SubmittedCards submissions={submissions} />
              ) : (
                <div style={styles.waitingForCzar}>
                  <p>All cards submitted! Waiting for {czarPlayer?.name} to judge...</p>
                  <div style={styles.submissionsPreview}>
                    {submissions.map(({ submissionId, cards }) => (
                      <div key={submissionId} style={previewCardStyle}>
                        {cards.map((c) => (
                          <p key={c.id} style={styles.previewText}>{c.text}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Round result overlay */}
      {(phase === 'scoring' || phase === 'ended') && (
        <RoundResult
          roundWinner={roundWinner}
          playerId={playerId}
          hostId={hostId}
          isGameOver={phase === 'ended'}
          gameWinner={gameWinner}
        />
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a' },
  header: {
    background: '#111',
    borderBottom: '1px solid #333',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerLeft: { display: 'flex', gap: 10, alignItems: 'center' },
  roundBadge: {
    fontSize: 13,
    fontWeight: 700,
    background: '#333',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: 3,
  },
  phaseBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: '#3498db',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: 3,
    letterSpacing: 1,
  },
  czarInfo: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 },
  czarLabel: { color: '#aaa' },
  czarName: { color: '#e74c3c', fontWeight: 700 },
  youCzar: { color: '#f1c40f', fontSize: 12, fontStyle: 'italic' },
  exitBtn: {
    background: 'none',
    border: '1px solid #555',
    color: '#aaa',
    padding: '6px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  main: {
    flex: 1,
    display: 'flex',
    gap: 24,
    padding: 24,
    alignItems: 'flex-start',
  },
  sidebar: { flexShrink: 0 },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    alignItems: 'center',
  },
  blackCardArea: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  progressBox: {
    background: '#2a2a2a',
    borderRadius: 8,
    padding: '16px 20px',
    alignSelf: 'center',
  },
  progressText: { fontSize: 18, fontWeight: 700, color: '#fff' },
  czarWait: { fontSize: 13, color: '#aaa', marginTop: 8, fontStyle: 'italic' },
  judgingArea: { width: '100%', maxWidth: 800 },
  waitingForCzar: { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  submissionsPreview: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  previewCard: {
    background: '#fff',
    color: '#000',
    borderRadius: 8,
    padding: '14px 12px',
    width: 160,
    minHeight: 180,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  previewText: { marginBottom: 6 },
};
