import socket from '../../socket.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function SubmittedCards({ submissions }) {
  const isMobile = useIsMobile();

  const handlePick = (submissionId) => {
    socket.emit('game:judgeWinner', { submissionId });
  };

  if (!submissions || submissions.length === 0) {
    return <p style={{ color: '#aaa', textAlign: 'center' }}>No submissions yet.</p>;
  }

  const cardStyle = isMobile
    ? { ...styles.submissionCard, width: 'calc(50% - 6px)', minHeight: 160, padding: '12px 10px', fontSize: 13 }
    : styles.submissionCard;

  return (
    <div style={styles.container}>
      <p style={styles.heading}>Pick the funniest answer:</p>
      <div style={styles.grid}>
        {submissions.map(({ submissionId, cards }) => (
          <button
            key={submissionId}
            style={cardStyle}
            onClick={() => handlePick(submissionId)}
          >
            {cards.map((card) => (
              <p key={card.id} style={styles.cardText}>{card.text}</p>
            ))}
            <span style={styles.pickLabel}>Pick this</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  heading: { color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center' },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  submissionCard: {
    background: '#fff',
    color: '#000',
    border: '3px solid transparent',
    borderRadius: 8,
    padding: '16px 14px',
    width: 180,
    minHeight: 220,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.4,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.1s, border-color 0.1s',
  },
  cardText: { marginBottom: 8 },
  pickLabel: {
    display: 'block',
    marginTop: 'auto',
    fontSize: 11,
    fontWeight: 700,
    color: '#3498db',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderTop: '1px solid #eee',
    paddingTop: 8,
  },
};
