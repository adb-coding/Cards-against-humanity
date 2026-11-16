import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ROLES, type RoleId } from 'lupus-shared';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  return <button type="button" className={`btn btn-${variant} ${className}`} {...props} />;
}

/**
 * Two-tap confirmation for actions that cannot be undone: the first tap arms the button
 * (showing `confirmLabel`), the second one within a few seconds runs `onConfirm`.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  variant = 'ghost',
  disabled,
  className,
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <Button
      variant={armed ? 'danger' : variant}
      className={className}
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal parchment ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi">
          ✕
        </button>
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Front of a role card: the illustration, with the role's motto written in its blank scroll. */
export function CardFace({ role, className = '' }: { role: RoleId; className?: string }) {
  const info = ROLES[role];
  if (!info.image) {
    // No illustration for this role yet: draw a card in the same spirit.
    return (
      <div className={`card card-plain ${className}`}>
        <span className="card-plain-title">{info.name}</span>
        <span className="card-plain-art" aria-hidden="true">
          🎭
        </span>
        <span className="card-motto">{info.tagline}</span>
      </div>
    );
  }
  return (
    <div className={`card ${className}`} data-role={role}>
      <img src={`${ASSETS}cards/${info.image}`} alt={info.name} draggable={false} />
      <span className="card-motto">{info.tagline}</span>
    </div>
  );
}

export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div className={`card card-back ${className}`} aria-hidden="true">
      <span className="card-back-frame">
        <span className="card-back-moon" />
        <span className="card-back-title">Lupus</span>
        <span className="card-back-sub">in Tabula</span>
      </span>
    </div>
  );
}

export const backgroundUrl = (scene: 'night' | 'day' | 'discussion') => `${ASSETS}bg-${scene}.webp`;
