/**
 * The prompt card. When `answers` are given, they are written into the blanks
 * (or appended when the prompt has none), so the Czar can read the full sentence.
 */
export default function BlackCard({ card, answers }) {
  if (!card) return null;

  const parts = card.text.split('___');
  const fills = answers?.map((a) => a.replace(/\.$/, '')) ?? [];
  const rendered = [];
  parts.forEach((part, i) => {
    rendered.push(<span key={`t${i}`}>{part}</span>);
    if (i < parts.length - 1) {
      rendered.push(
        fills[i] ? (
          <span key={`a${i}`} className="bcard-answer">{fills[i]}</span>
        ) : (
          <span key={`b${i}`} className="bcard-blank" aria-label="blank" />
        )
      );
    }
  });
  if (parts.length === 1 && fills.length) {
    rendered.push(
      <span key="appended" className="bcard-answer bcard-answer--block">{fills.join(' / ')}</span>
    );
  }

  return (
    <div className="bcard">
      <p className="bcard-text">{rendered}</p>
      <div className="bcard-foot">
        <span className="bcard-logo">Cards Against Humanity</span>
        {card.pick > 1 && <span className="bcard-pick">Pick {card.pick}</span>}
      </div>
    </div>
  );
}
