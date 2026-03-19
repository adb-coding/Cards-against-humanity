import { useIsMobile } from '../../hooks/useIsMobile.js';

const RANK_COLORS = ['#f1c40f', '#aaaaaa', '#cd7f32'];

function getRankColor(index) {
  return RANK_COLORS[index] || '#555';
}

export default function ScoreBoard({ players, scores, czarId }) {
  const isMobile = useIsMobile();
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const maxScore = Math.max(1, ...Object.values(scores));

  if (isMobile) {
    return (
      <div style={styles.stripContainer}>
        {sorted.map((p, i) => {
          const isCzar = p.id === czarId;
          const score = scores[p.id] || 0;
          return (
            <div
              key={p.id}
              style={{
                ...styles.chip,
                ...(isCzar ? styles.chipCzar : {}),
              }}
            >
              <div style={{ ...styles.chipDot, background: getRankColor(i) }} />
              <span style={styles.chipName}>{p.name}</span>
              <span style={{ ...styles.chipScore, color: getRankColor(i) === '#555' ? '#f1c40f' : getRankColor(i) }}>
                {score}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Scores</h3>
      <ul style={styles.list}>
        {sorted.map((p, i) => {
          const isCzar = p.id === czarId;
          const score = scores[p.id] || 0;
          const pct = Math.round((score / maxScore) * 100);
          const rankColor = getRankColor(i);
          return (
            <li key={p.id} style={styles.item}>
              <div style={{ ...styles.rankDot, background: rankColor }} />
              <div style={styles.playerInfo}>
                <div style={styles.nameRow}>
                  <span style={styles.name}>{p.name}</span>
                  {isCzar && <span style={styles.czarBadge}>CZAR</span>}
                  <span style={styles.scorePill}>{score}</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressBar, width: `${pct}%`, background: rankColor }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const styles = {
  // Desktop
  container: {
    background: '#2a2a2a',
    borderRadius: 8,
    padding: '16px 20px',
    minWidth: 200,
  },
  heading: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 },
  item: { display: 'flex', alignItems: 'center', gap: 10 },
  rankDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerInfo: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  czarBadge: {
    fontSize: 9,
    background: '#e74c3c',
    color: '#fff',
    padding: '1px 5px',
    borderRadius: 3,
    fontWeight: 700,
    letterSpacing: 1,
    flexShrink: 0,
  },
  scorePill: {
    background: '#f1c40f',
    color: '#000',
    borderRadius: 12,
    padding: '1px 8px',
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },
  progressTrack: {
    height: 3,
    background: '#444',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  },

  // Mobile chip strip
  stripContainer: {
    display: 'flex',
    flexDirection: 'row',
    overflowX: 'auto',
    gap: 4,
    borderBottom: '1px solid #333',
    padding: '8px 12px',
    background: '#111',
  },
  chip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    minWidth: 56,
    flexShrink: 0,
    padding: '4px 6px',
    borderRadius: 6,
    background: '#1a1a1a',
  },
  chipCzar: {
    borderBottom: '2px solid #e74c3c',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  chipName: {
    fontSize: 11,
    color: '#aaa',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 56,
  },
  chipScore: {
    fontSize: 15,
    fontWeight: 800,
  },
};
