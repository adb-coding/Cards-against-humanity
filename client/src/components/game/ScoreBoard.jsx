export default function ScoreBoard({ players, scores, czarId }) {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Scores</h3>
      <ul style={styles.list}>
        {sorted.map((p) => (
          <li key={p.id} style={styles.item}>
            <span style={styles.name}>
              {p.name}
              {p.id === czarId && <span style={styles.czarBadge}>CZAR</span>}
            </span>
            <span style={styles.score}>{scores[p.id] || 0} ★</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: {
    background: '#2a2a2a',
    borderRadius: 8,
    padding: '16px 20px',
    minWidth: 200,
  },
  heading: { fontSize: 14, color: '#aaa', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 },
  czarBadge: {
    fontSize: 9,
    background: '#e74c3c',
    color: '#fff',
    padding: '1px 5px',
    borderRadius: 3,
    fontWeight: 700,
    letterSpacing: 1,
  },
  score: { fontSize: 16, fontWeight: 700, color: '#f1c40f' },
};
