import { useEffect } from 'react';
import styles from '../../styles/GameModals.module.css';

interface Props {
  notification: { action: string; presidentName: string; targetName?: string };
  onDismiss: () => void;
}

function describe({ action, presidentName: p, targetName: t }: Props['notification']): string {
  switch (action) {
    case 'investigate-loyalty':
      return t ? `President ${p} investigated ${t}'s party membership.` : `President ${p} will investigate a player.`;
    case 'special-election':
      return t ? `Special election! ${t} will be the next President.` : `President ${p} will pick the next President.`;
    case 'policy-peek':
      return `President ${p} is peeking at the top 3 policies.`;
    case 'execution':
      return t ? `${t} has been executed by President ${p}.` : `President ${p} must execute a player.`;
    default:
      return `President ${p} is using an executive power.`;
  }
}

export function ExecutiveActionToast({ notification, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  return (
    <div className={styles.toast} role="status" onClick={onDismiss}>
      {describe(notification)}
    </div>
  );
}
