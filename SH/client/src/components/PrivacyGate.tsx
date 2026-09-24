import styles from '../styles/PrivacyGate.module.css';

interface Props {
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
}

/** Asks the player to make sure nobody else can see the screen before secret info is shown. */
export function PrivacyGate({ onConfirm, onCancel, confirmLabel = 'Show my role' }: Props) {
  return (
    <div className={styles.gate}>
      <div className={styles.eye} aria-hidden="true">
        <svg viewBox="0 0 64 40" width="72" height="45">
          <path d="M2 20C10 8 20 2 32 2s22 6 30 18c-8 12-18 18-30 18S10 32 2 20Z" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="32" cy="20" r="9" fill="currentColor" />
          <line x1="8" y1="36" x2="56" y2="4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      <div className={styles.title}>Top secret</div>
      <p className={styles.text}>
        Make sure <b>nobody else can see your screen</b>. Pick up your phone and shield it before continuing.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          Nobody is watching — {confirmLabel}
        </button>
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
