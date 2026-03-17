import { useState } from 'react';
import socket from '../../socket.js';

export default function JoinRoom({ onBack }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    socket.emit('room:join', { playerName: name.trim(), roomCode: code.trim().toUpperCase() });
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Join a Room</h2>
      <form onSubmit={handleJoin} style={styles.form}>
        <input
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />
        <input
          style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: 4 }}
          placeholder="Room code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
        />
        <button style={styles.btn} type="submit" disabled={!name.trim() || code.trim().length < 6}>
          Join
        </button>
      </form>
      <button style={styles.back} onClick={onBack}>← Back</button>
    </div>
  );
}

const styles = {
  card: {
    background: '#2a2a2a',
    padding: 32,
    borderRadius: 8,
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  heading: { fontSize: 22, fontWeight: 700, color: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 14px',
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #555',
    background: '#111',
    color: '#fff',
    outline: 'none',
  },
  btn: {
    padding: '12px 0',
    fontSize: 16,
    fontWeight: 700,
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  back: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: 14,
    textAlign: 'left',
  },
};
