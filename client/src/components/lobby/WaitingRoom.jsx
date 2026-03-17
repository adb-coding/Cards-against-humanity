import socket from '../../socket.js';

export default function WaitingRoom({ gameState }) {
  const { roomCode, playerId, hostId, players } = gameState;
  const isHost = playerId === hostId;

  const handleStart = () => {
    socket.emit('game:start');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Waiting Room</h2>

        <div style={styles.codeBox}>
          <p style={styles.codeLabel}>Room Code</p>
          <p style={styles.code}>{roomCode}</p>
          <p style={styles.codeHint}>Share this code with friends to join</p>
        </div>

        <div style={styles.playerSection}>
          <p style={styles.playerCount}>{players.length} player{players.length !== 1 ? 's' : ''} in room</p>
          <ul style={styles.playerList}>
            {players.map((p) => (
              <li key={p.id} style={styles.playerItem}>
                <span style={styles.playerDot} />
                {p.name}
                {p.id === hostId && <span style={styles.hostBadge}>HOST</span>}
                {p.id === playerId && <span style={styles.youBadge}>YOU</span>}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <button
            style={{ ...styles.btn, opacity: players.length < 2 ? 0.5 : 1 }}
            onClick={handleStart}
            disabled={players.length < 2}
          >
            {players.length < 2 ? 'Waiting for players...' : 'Start Game'}
          </button>
        ) : (
          <p style={styles.waitingText}>Waiting for the host to start the game...</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 20,
  },
  card: {
    background: '#2a2a2a',
    padding: 32,
    borderRadius: 8,
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  heading: { fontSize: 24, fontWeight: 700, color: '#fff', textAlign: 'center' },
  codeBox: {
    background: '#111',
    borderRadius: 8,
    padding: '20px 24px',
    textAlign: 'center',
  },
  codeLabel: { fontSize: 12, color: '#aaa', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  code: { fontSize: 44, fontWeight: 900, letterSpacing: 10, color: '#fff', fontFamily: 'monospace' },
  codeHint: { fontSize: 12, color: '#666', marginTop: 8 },
  playerSection: { display: 'flex', flexDirection: 'column', gap: 12 },
  playerCount: { fontSize: 14, color: '#aaa' },
  playerList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  playerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    background: '#333',
    borderRadius: 4,
    fontSize: 15,
    color: '#fff',
  },
  playerDot: { width: 8, height: 8, borderRadius: '50%', background: '#2ecc71', flexShrink: 0 },
  hostBadge: {
    marginLeft: 'auto',
    fontSize: 10,
    background: '#f39c12',
    color: '#000',
    padding: '2px 6px',
    borderRadius: 3,
    fontWeight: 700,
    letterSpacing: 1,
  },
  youBadge: {
    marginLeft: 'auto',
    fontSize: 10,
    background: '#3498db',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: 3,
    fontWeight: 700,
    letterSpacing: 1,
  },
  btn: {
    padding: '14px 0',
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
  waitingText: { textAlign: 'center', color: '#aaa', fontSize: 14, fontStyle: 'italic' },
};
