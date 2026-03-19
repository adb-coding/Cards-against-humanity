import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function BlackCard({ card }) {
  const isMobile = useIsMobile();

  if (!card) return null;

  // Render ___ placeholders as styled blanks
  const parts = card.text.split('___');
  const rendered = parts.reduce((acc, part, i) => {
    acc.push(<span key={`t${i}`}>{part}</span>);
    if (i < parts.length - 1) {
      acc.push(
        <span key={`b${i}`} style={styles.blank}>
          ___________
        </span>
      );
    }
    return acc;
  }, []);

  const cardStyle = isMobile
    ? { ...styles.card, width: '100%', maxWidth: 280, minHeight: 200, padding: '20px 16px 16px', flexShrink: 1 }
    : styles.card;

  const textStyle = isMobile
    ? { ...styles.text, fontSize: 17 }
    : styles.text;

  return (
    <div style={cardStyle}>
      <p style={textStyle}>{rendered}</p>
      {card.pick > 1 && (
        <p style={styles.pick}>PICK {card.pick}</p>
      )}
      <div style={styles.footer}>
        <span style={styles.logo}>Cards Against Humanity</span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#000',
    color: '#fff',
    border: '2px solid #333',
    borderRadius: 12,
    padding: '28px 24px 20px',
    width: 240,
    minHeight: 320,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  text: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.5,
    flex: 1,
  },
  blank: {
    borderBottom: '2px solid #fff',
    display: 'inline-block',
  },
  pick: {
    fontSize: 11,
    fontWeight: 700,
    border: '2px solid #fff',
    borderRadius: 3,
    padding: '2px 6px',
    alignSelf: 'flex-start',
    marginTop: 12,
    letterSpacing: 2,
  },
  footer: {
    marginTop: 12,
    borderTop: '1px solid #333',
    paddingTop: 8,
  },
  logo: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
};
