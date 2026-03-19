import { useState, useEffect } from 'react';
import socket from '../../socket.js';

export default function CreateRoom({ onBack, availableOptions }) {
  const [name, setName] = useState('');
  const [lang, setLang] = useState('en');
  const [expansions, setExpansions] = useState(['base']);

  useEffect(() => {
    if (availableOptions?.languages?.length > 0 && !availableOptions.languages.includes(lang)) {
      setLang(availableOptions.languages[0]);
    }
  }, [availableOptions]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    socket.emit('room:create', {
      playerName: name.trim(),
      options: { lang, expansions },
    });
  };

  const toggleExpansion = (id) => {
    setExpansions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const packs = availableOptions?.expansionsByLang?.[lang] || [];

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Create a Room</h2>
      <form onSubmit={handleCreate} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Your Name</label>
          <input
            style={styles.input}
            placeholder="e.g. Card Czar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Language</label>
          <select
            style={styles.input}
            value={lang}
            onChange={(e) => {
              setLang(e.target.value);
              setExpansions(['base']);
            }}
          >
            {availableOptions?.languages?.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Expansions</label>
          <div style={styles.expansionList}>
            {packs.map((p) => (
              <label key={p} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={expansions.includes(p)}
                  onChange={() => toggleExpansion(p)}
                />
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <button style={styles.btn} type="submit" disabled={!name.trim() || expansions.length === 0}>
          Create
        </button>
      </form>
      <button style={styles.back} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

const styles = {
  card: {
    background: '#2a2a2a',
    padding: 32,
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  heading: { fontSize: 22, fontWeight: 700, color: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 14, fontWeight: 600, color: '#aaa', textTransform: 'uppercase' },
  input: {
    padding: '12px 14px',
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #555',
    background: '#111',
    color: '#fff',
    outline: 'none',
  },
  expansionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 120,
    overflowY: 'auto',
    padding: '8px 12px',
    background: '#111',
    borderRadius: 4,
    border: '1px solid #555',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 15,
    cursor: 'pointer',
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
    marginTop: 8,
  },
};
