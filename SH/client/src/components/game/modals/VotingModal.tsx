import { useState } from 'react';
import type { Vote } from 'shared';
import { asset } from '../../../lib/assets.js';
import styles from '../../../styles/GameModals.module.css';

interface Props {
  presidentName: string;
  chancellorName: string;
  onVote: (vote: Vote) => void;
}

export function VotingModal({ presidentName, chancellorName, onVote }: Props) {
  const [selected, setSelected] = useState<Vote | null>(null);
  const [sent, setSent] = useState(false);

  const cardClass = (vote: Vote) =>
    [
      styles.voteCard,
      selected === vote && styles.voteCardSelected,
      selected !== null && selected !== vote && styles.voteCardDimmed,
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Election">
        <div className={styles.title}>Election</div>
        <div className={styles.subtitle}>
          President <strong>{presidentName}</strong> nominates <strong>{chancellorName}</strong> as Chancellor.
          <br />
          Do you support this government?
        </div>
        <div className={styles.voteCards}>
          <button type="button" className={styles.voteCardBtn} onClick={() => setSelected('ja')} aria-pressed={selected === 'ja'}>
            <img src={asset('vote-yes.png')} alt="Ja! (yes)" className={cardClass('ja')} />
          </button>
          <button type="button" className={styles.voteCardBtn} onClick={() => setSelected('nein')} aria-pressed={selected === 'nein'}>
            <img src={asset('vote-no.png')} alt="Nein (no)" className={cardClass('nein')} />
          </button>
        </div>
        <button
          className={`${styles.btnPrimary} ${styles.btnWide}`}
          disabled={selected === null || sent}
          onClick={() => {
            if (!selected) return;
            setSent(true);
            onVote(selected);
          }}
        >
          {sent ? 'Vote cast…' : selected ? `Vote ${selected === 'ja' ? 'Ja!' : 'Nein'}` : 'Choose a card'}
        </button>
      </div>
    </div>
  );
}
