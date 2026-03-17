import { useState } from 'react';
import CreateRoom from './CreateRoom.jsx';
import JoinRoom from './JoinRoom.jsx';

export default function LobbyScreen() {
  const [view, setView] = useState('home'); // home | create | join

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Cards Against Humanity</h1>
      <p style={styles.subtitle}>A party game for horrible people.</p>

      {view === 'home' && (
        <div style={styles.buttonGroup}>
          <button style={styles.btnPrimary} onClick={() => setView('create')}>
            Create Room
          </button>
          <button style={styles.btnSecondary} onClick={() => setView('join')}>
            Join Room
          </button>
        </div>
      )}

      {view === 'create' && <CreateRoom onBack={() => setView('home')} />}
      {view === 'join' && <JoinRoom onBack={() => setView('home')} />}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 20,
    gap: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    fontStyle: 'italic',
  },
  buttonGroup: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btnPrimary: {
    background: '#fff',
    color: '#000',
    border: 'none',
    padding: '14px 32px',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnSecondary: {
    background: 'transparent',
    color: '#fff',
    border: '2px solid #fff',
    padding: '14px 32px',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
};
