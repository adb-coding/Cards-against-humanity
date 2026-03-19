import socket from '../../socket.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function RoundResult({ roundWinner, playerId, hostId, isGameOver, gameWinner }) {
  const isMobile = useIsMobile();
  const isHost = playerId === hostId;

  const cardStyle = isMobile
    ? { ...styles.card, padding: '24px 16px', gap: 14, maxWidth: '100%' }
    : styles.card;

  const titleStyle = isMobile
    ? { ...styles.title, fontSize: 22 }
    : styles.title;

  const winnerNameStyle = isMobile
    ? { ...styles.winnerName, fontSize: 20 }
    : styles.winnerName;

  const whiteCardStyle = isMobile
    ? { ...styles.whiteCard, maxWidth: 'calc(50% - 6px)', fontSize: 13, padding: '12px 10px' }
    : styles.whiteCard;

  if (isGameOver) {
    const subtitleStyle = isMobile
      ? { ...styles.subtitle, fontSize: 18 }
      : styles.subtitle;
    return (
      <div style={styles.overlay}>
        <div style={cardStyle}>
          <h2 style={titleStyle}>Game Over!</h2>
          <p style={subtitleStyle}>{gameWinner?.name} wins the game!</p>
          {isHost && (
            <button style={styles.btn} onClick={() => window.location.reload()}>
              Play Again
            </button>
          )}
          {!isHost && <p style={styles.wait}>Waiting for host...</p>}
        </div>
      </div>
    );
  }

  if (!roundWinner) return null;

  return (
    <div style={styles.overlay}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>Round Winner!</h2>
        <p style={winnerNameStyle}>{roundWinner.name}</p>
        <div style={styles.winningCards}>
          {roundWinner.cards?.map((card) => (
            <div key={card.id} style={whiteCardStyle}>
              {card.text}
            </div>
          ))}
        </div>
        {isHost ? (
          <button style={styles.btn} onClick={() => socket.emit('game:nextRound')}>
            Next Round
          </button>
        ) : (
          <p style={styles.wait}>Waiting for host to start next round...</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 20,
  },
  card: {
    background: '#2a2a2a',
    borderRadius: 12,
    padding: 40,
    maxWidth: 480,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    textAlign: 'center',
  },
  title: { fontSize: 28, fontWeight: 900, color: '#f1c40f' },
  subtitle: { fontSize: 22, fontWeight: 700, color: '#fff' },
  winnerName: { fontSize: 26, fontWeight: 900, color: '#2ecc71' },
  winningCards: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  whiteCard: {
    background: '#fff',
    color: '#000',
    borderRadius: 8,
    padding: '16px 14px',
    fontSize: 14,
    fontWeight: 600,
    maxWidth: 200,
    lineHeight: 1.4,
  },
  btn: {
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 700,
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  wait: { color: '#aaa', fontSize: 14, fontStyle: 'italic' },
};
