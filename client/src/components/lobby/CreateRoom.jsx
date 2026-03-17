import { useState } from 'react';
import socket from '../../socket.js';

export default function CreateRoom({ onBack }) {
  const [name, setName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    socket.emit('room:create', { playerName: name.trim() });
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Create a Room</h2>
      <form onSubmit={handleCreate} style={styles.form}>
        <input
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />
        <button style={styles.btn} type="submit" disabled={!name.trim()}>
          Create
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
