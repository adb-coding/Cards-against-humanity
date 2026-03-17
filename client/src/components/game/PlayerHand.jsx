import { useState } from 'react';
import socket from '../../socket.js';

export default function PlayerHand({ hand, blackCard, hasSubmitted }) {
  const [selected, setSelected] = useState([]);

  const required = blackCard?.pick || 1;

  const toggleCard = (card) => {
    if (hasSubmitted) return;
    setSelected((prev) => {
      const isSelected = prev.some((c) => c.id === card.id);
      if (isSelected) return prev.filter((c) => c.id !== card.id);
      if (prev.length >= required) return prev; // can't select more than required
      return [...prev, card];
    });
  };

  const handleSubmit = () => {
    if (selected.length !== required) return;
    socket.emit('game:submitCards', { cardIds: selected.map((c) => c.id) });
  };

  if (hasSubmitted) {
    return (
      <div style={styles.waitingMsg}>
        <p>Cards submitted! Waiting for others...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <p style={styles.instruction}>
        {required === 1
          ? 'Pick 1 white card'
          : `Pick ${required} white cards (${selected.length}/${required} selected)`}
      </p>
      <div style={styles.hand}>
        {hand.map((card) => {
          const isSelected = selected.some((c) => c.id === card.id);
          return (
            <button
              key={card.id}
              onClick={() => toggleCard(card)}
              style={{
                ...styles.whiteCard,
                ...(isSelected ? styles.selected : {}),
              }}
            >
              {card.text}
            </button>
          );
        })}
      </div>
      <button
        style={{
          ...styles.submitBtn,
          opacity: selected.length === required ? 1 : 0.4,
        }}
        disabled={selected.length !== required}
        onClick={handleSubmit}
      >
        Submit {required === 1 ? 'Card' : 'Cards'}
      </button>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  instruction: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  hand: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  whiteCard: {
    background: '#fff',
    color: '#000',
    border: '3px solid transparent',
    borderRadius: 8,
    padding: '16px 14px',
    width: 160,
    minHeight: 200,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.4,
    cursor: 'pointer',
    textAlign: 'left',
    verticalAlign: 'top',
    transition: 'transform 0.1s, border-color 0.1s',
  },
  selected: {
    borderColor: '#3498db',
    transform: 'translateY(-8px)',
    boxShadow: '0 8px 20px rgba(52,152,219,0.4)',
  },
  submitBtn: {
    padding: '14px 0',
    fontSize: 16,
    fontWeight: 700,
    background: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    maxWidth: 300,
    alignSelf: 'center',
    width: '100%',
  },
  waitingMsg: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 16,
    padding: 20,
    fontStyle: 'italic',
  },
};
