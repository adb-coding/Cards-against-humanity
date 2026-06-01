import { useState, useEffect } from 'react';
import socket from '../../socket.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function CreateRoom({ onBack, availableOptions }) {
  const [name, setName] = useState('');
  const [lang, setLang] = useState('en');
  const [expansions, setExpansions] = useState(['base']);
  const [maxRedraws, setMaxRedraws] = useState(1);
  const isMobile = useIsMobile();

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
      options: { lang, expansions, maxRedraws },
    });
  };

  const toggleExpansion = (id) => {
    setExpansions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const packs = availableOptions?.expansionsByLang?.[lang] || [];

  const cardStyle = isMobile
    ? { ...styles.card, padding: '24px 16px' }
    : styles.card;

  const tileStyle = isMobile
    ? { ...styles.tile, width: 'calc(50% - 4px)' }
    : styles.tile;

  return (
    <div style={cardStyle}>
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
          <div style={styles.pillGroup}>
            {availableOptions?.languages?.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLang(l);
                  setExpansions(['base']);
                }}
                style={{
                  ...styles.pill,
                  ...(lang === l ? styles.pillActive : styles.pillInactive),
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Expansions</label>
          <div style={styles.tileGrid}>
            {packs.map((p) => {
              const active = expansions.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleExpansion(p)}
                  style={{
                    ...tileStyle,
                    ...(active ? styles.tileActive : styles.tileInactive),
                  }}
                >
                  <span
                    style={{
                      ...styles.tileCheck,
                      background: active ? '#3498db' : '#333',
                    }}
                  >
                    {active ? '✓' : ''}
                  </span>
                  <span style={styles.tileName}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Hand Redraws Per Player</label>
          <div style={styles.pillGroup}>
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxRedraws(n)}
                style={{
                  ...styles.pill,
                  ...(maxRedraws === n ? styles.pillActive : styles.pillInactive),
                }}
              >
                {n === 0 ? 'Off' : n}
              </button>
            ))}
          </div>
          <span style={styles.fieldHint}>
            Times each player can swap their entire hand
          </span>
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
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  heading: { fontSize: 22, fontWeight: 700, color: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 },
  fieldHint: { fontSize: 11, color: '#666', marginTop: 2 },
  input: {
    padding: '12px 14px',
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #555',
    background: '#111',
    color: '#fff',
    outline: 'none',
  },

  // Language pill toggles
  pillGroup: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  pill: {
    padding: '8px 20px',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 1,
    textTransform: 'uppercase',
    transition: 'background 0.15s, color 0.15s',
  },
  pillActive: {
    background: '#3498db',
    color: '#fff',
    border: '2px solid #3498db',
  },
  pillInactive: {
    background: 'transparent',
    color: '#aaa',
    border: '2px solid #444',
  },

  // Expansion tile grid
  tileGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'left',
    width: '100%',
    flexGrow: 1,
    transition: 'background 0.15s, border-color 0.15s',
  },
  tileActive: {
    background: 'rgba(52, 152, 219, 0.15)',
    border: '2px solid #3498db',
    color: '#fff',
  },
  tileInactive: {
    background: '#111',
    border: '2px solid #444',
    color: '#aaa',
  },
  tileCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  },
  tileName: { flex: 1 },

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
