import { useState } from 'react';
import socket from '../../socket.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function PlayerHand({ hand, blackCard, hasSubmitted, onSubmitted, maxRedraws, myRedraws }) {
  const [selected, setSelected] = useState([]);
  const isMobile = useIsMobile();

  const required = blackCard?.pick || 1;
  const redrawnLeft = (maxRedraws ?? 0) - (myRedraws ?? 0);

  const toggleCard = (card) => {
    if (hasSubmitted) return;
    setSelected((prev) => {
      const idx = prev.findIndex((c) => c.id === card.id);
      if (idx !== -1) return prev.filter((c) => c.id !== card.id);
      if (prev.length >= required) return prev;
      return [...prev, card];
    });
  };

  const handleSubmit = () => {
    if (selected.length !== required) return;
    socket.emit('game:submitCards', { cardIds: selected.map((c) => c.id) });
    onSubmitted?.();
  };

  const handleRedraw = () => {
    if (redrawnLeft <= 0) return;
    setSelected([]);
    socket.emit('game:redrawHand');
  };

  if (hasSubmitted) {
    return (
      <div style={styles.waitingMsg}>
        <p>Cards submitted! Waiting for others...</p>
      </div>
    );
  }

  const cardStyle = isMobile
    ? { ...styles.whiteCard, width: 'calc(50% - 4px)', minHeight: 160, padding: '12px 10px', fontSize: 13 }
    : styles.whiteCard;

  const selectedStyle = isMobile
    ? { ...styles.selected, transform: 'translateY(-4px)', boxShadow: '0 4px 12px rgba(52,152,219,0.4)' }
    : styles.selected;

  const submitStyle = isMobile
    ? { ...styles.submitBtn, maxWidth: '100%' }
    : styles.submitBtn;

  return (
    <div style={styles.container}>
      <p style={styles.instruction}>
        {required === 1
          ? 'Pick 1 white card'
          : `Pick ${required} white cards (${selected.length}/${required} selected)`}
      </p>
      <div style={styles.hand}>
        {hand.map((card) => {
          const selIdx = selected.findIndex((c) => c.id === card.id);
          const isSelected = selIdx !== -1;
          return (
            <button
              key={card.id}
              onClick={() => toggleCard(card)}
              style={{
                ...cardStyle,
                ...(isSelected ? selectedStyle : {}),
                position: 'relative',
              }}
            >
              {isSelected && required > 1 && (
                <span style={styles.orderBadge}>{selIdx + 1}</span>
              )}
              {card.text}
            </button>
          );
        })}
      </div>
      <div style={styles.actions}>
        {maxRedraws > 0 && (
          <button
            style={{
              ...styles.redrawBtn,
              opacity: redrawnLeft > 0 ? 1 : 0.35,
              cursor: redrawnLeft > 0 ? 'pointer' : 'not-allowed',
            }}
            disabled={redrawnLeft <= 0}
            onClick={handleRedraw}
            title={redrawnLeft <= 0 ? 'No redraws remaining' : `Redraw all cards (${redrawnLeft} left)`}
          >
            ↺ Redraw Hand ({redrawnLeft} left)
          </button>
        )}
        <button
          style={{
            ...submitStyle,
            opacity: selected.length === required ? 1 : 0.4,
          }}
          disabled={selected.length !== required}
          onClick={handleSubmit}
        >
          Submit {required === 1 ? 'Card' : 'Cards'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  instruction: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  hand: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
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
  orderBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#3498db',
    color: '#fff',
    fontSize: 12,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    pointerEvents: 'none',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
    width: '100%',
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
    width: '100%',
  },
  redrawBtn: {
    padding: '10px 0',
    fontSize: 13,
    fontWeight: 700,
    background: 'transparent',
    color: '#aaa',
    border: '2px solid #444',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    maxWidth: 300,
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
