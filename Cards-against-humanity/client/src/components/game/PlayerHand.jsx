import { useEffect, useState } from 'react';
import socket from '../../socket.js';

export default function PlayerHand({ hand, blackCard, redrawsLeft, handVersion, onSubmit, onPreview }) {
  const [selected, setSelected] = useState([]);
  const [confirmRedraw, setConfirmRedraw] = useState(false);
  const required = blackCard?.pick || 1;

  // A redraw or a new round invalidates the selection
  useEffect(() => {
    setSelected([]);
    setConfirmRedraw(false);
  }, [handVersion, blackCard?.id]);

  useEffect(() => {
    onPreview(selected.map((c) => c.text));
  }, [selected, onPreview]);

  const toggleCard = (card) => {
    setSelected((prev) => {
      if (prev.some((c) => c.id === card.id)) return prev.filter((c) => c.id !== card.id);
      if (required === 1) return [card];
      if (prev.length >= required) return prev;
      return [...prev, card];
    });
  };

  const handleRedraw = () => {
    if (!confirmRedraw) {
      setConfirmRedraw(true);
      return;
    }
    setConfirmRedraw(false);
    socket.emit('game:redrawHand');
  };

  const canRedraw = redrawsLeft !== 0;
  const ready = selected.length === required;

  return (
    <>
      <p className="hint-line">
        {required === 1 ? 'Tap the card you want to play' : `Pick ${required} cards in order (${selected.length}/${required})`}
      </p>
      <div className="hand" key={handVersion}>
        {hand.map((card, i) => {
          const order = selected.findIndex((c) => c.id === card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={`wcard wcard--hand ${order >= 0 ? 'is-selected' : ''}`}
              style={{ '--i': i }}
              onClick={() => toggleCard(card)}
              aria-pressed={order >= 0}
            >
              <span className="wcard-text">{card.text}</span>
              {order >= 0 && required > 1 && <span className="wcard-order">{order + 1}</span>}
            </button>
          );
        })}
      </div>

      <div className="action-bar">
        {canRedraw && (
          <button
            type="button"
            className={`btn ${confirmRedraw ? 'btn--warn' : 'btn--ghost'} btn--redraw`}
            onClick={handleRedraw}
            onBlur={() => setConfirmRedraw(false)}
          >
            {confirmRedraw ? 'Swap all 7?' : '↻ Redraw'}
            <small>{confirmRedraw ? 'tap again' : redrawsLeft < 0 ? 'unlimited' : `${redrawsLeft} left`}</small>
          </button>
        )}
        <button
          type="button"
          className="btn btn--primary btn--grow"
          disabled={!ready}
          onClick={() => onSubmit(selected)}
        >
          {ready ? `Play ${required === 1 ? 'card' : 'cards'}` : `Select ${required - selected.length} more`}
        </button>
      </div>
    </>
  );
}
