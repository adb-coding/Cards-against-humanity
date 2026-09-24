import { useEffect, useState } from 'react';
import { getExecutiveActionTier } from 'shared';
import styles from '../styles/Rules.module.css';

interface Props {
  /** Current number of players, used to highlight the relevant rows. */
  playerCount?: number;
}

const ROLE_ROWS = [
  { players: 5, liberals: 3, fascists: 1 },
  { players: 6, liberals: 4, fascists: 1 },
  { players: 7, liberals: 4, fascists: 2 },
  { players: 8, liberals: 5, fascists: 2 },
  { players: 9, liberals: 5, fascists: 3 },
  { players: 10, liberals: 6, fascists: 3 },
];

const POWER_ROWS: Array<{ tier: string; label: string; powers: string[] }> = [
  { tier: '5-6', label: '5–6', powers: ['—', '—', 'Policy Peek', 'Execution', 'Execution + Veto'] },
  { tier: '7-8', label: '7–8', powers: ['—', 'Investigate', 'Special Election', 'Execution', 'Execution + Veto'] },
  { tier: '9-10', label: '9–10', powers: ['Investigate', 'Investigate', 'Special Election', 'Execution', 'Execution + Veto'] },
];

export function HelpButton({ playerCount }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const tier = playerCount && playerCount >= 5 ? getExecutiveActionTier(playerCount) : null;

  return (
    <>
      <button
        type="button"
        className={styles.helpBtn}
        onClick={() => setOpen(true)}
        aria-label="Game rules"
        title="Game rules"
      >
        ?
      </button>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.header}>
              <h2 id="rules-title" className={styles.title}>Rules</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close rules">
                ✕
              </button>
            </header>

            <div className={styles.body}>
              <p className={styles.lead}>
                Players are secretly split into <b className={styles.lib}>Liberals</b> and{' '}
                <b className={styles.fas}>Fascists</b>. One Fascist is secretly <b className={styles.fas}>Hitler</b>.
                Liberals hold the majority, but nobody knows who to trust.
              </p>

              <details className={styles.section} open>
                <summary>How to win</summary>
                <ul>
                  <li><b className={styles.lib}>Liberals</b> win by enacting <b>5 Liberal policies</b> or by <b>executing Hitler</b>.</li>
                  <li><b className={styles.fas}>Fascists</b> win by enacting <b>6 Fascist policies</b>, or if <b>Hitler is elected Chancellor</b> after 3 Fascist policies are on the board.</li>
                </ul>
              </details>

              <details className={styles.section}>
                <summary>Roles &amp; secret information</summary>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Players</th><th>Liberals</th><th>Fascists</th><th>Hitler</th></tr>
                  </thead>
                  <tbody>
                    {ROLE_ROWS.map((r) => (
                      <tr key={r.players} className={r.players === playerCount ? styles.current : undefined}>
                        <td>{r.players}</td><td>{r.liberals}</td><td>{r.fascists}</td><td>1</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul>
                  <li>Fascists know each other and know who Hitler is.</li>
                  <li>With 5–6 players Hitler also knows the Fascist. With 7+ players Hitler does not know who the Fascists are.</li>
                  <li>Liberals know nothing. Everyone may lie about their role.</li>
                </ul>
              </details>

              <details className={styles.section}>
                <summary>1 · Nomination</summary>
                <ul>
                  <li>The Presidency passes to the next player every round.</li>
                  <li>The President nominates a Chancellor.</li>
                  <li>The last <i>elected</i> President and Chancellor are term-limited and cannot be nominated. With only 5 players left alive, only the last Chancellor is term-limited.</li>
                </ul>
              </details>

              <details className={styles.section}>
                <summary>2 · Election</summary>
                <ul>
                  <li>Every living player votes <b>Ja!</b> (yes) or <b>Nein</b> (no). Votes are revealed together.</li>
                  <li>The government is elected only with a strict majority of Ja. A tie fails.</li>
                  <li>A failed election advances the <b>Election Tracker</b>. After 3 failures in a row the top policy is enacted automatically, its power is ignored, and term limits are reset.</li>
                  <li>If 3+ Fascist policies are enacted and Hitler is elected Chancellor, the Fascists win immediately.</li>
                </ul>
              </details>

              <details className={styles.section}>
                <summary>3 · Legislative session</summary>
                <ul>
                  <li>The President draws 3 policies, secretly discards 1 and hands 2 to the Chancellor.</li>
                  <li>The Chancellor secretly discards 1 and enacts the other.</li>
                  <li>The deck holds 6 Liberal and 11 Fascist policies. No table talk during the session — afterwards, anyone may lie about what they saw.</li>
                </ul>
              </details>

              <details className={styles.section}>
                <summary>4 · Presidential powers</summary>
                <p>Some Fascist policies give the President a power that must be used before the next round.</p>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Players</th><th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th></tr>
                    </thead>
                    <tbody>
                      {POWER_ROWS.map((r) => (
                        <tr key={r.tier} className={r.tier === tier ? styles.current : undefined}>
                          <td>{r.label}</td>
                          {r.powers.map((p, i) => <td key={i}>{p}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul>
                  <li><b>Investigate Loyalty:</b> see a player's party membership (Hitler shows as Fascist). Nobody can be investigated twice.</li>
                  <li><b>Special Election:</b> choose the next President. Afterwards, the normal order resumes.</li>
                  <li><b>Policy Peek:</b> secretly look at the top 3 policies of the deck.</li>
                  <li><b>Execution:</b> kill a player. If it is Hitler, the Liberals win. The dead can no longer speak, vote or run for office.</li>
                </ul>
              </details>

              <details className={styles.section}>
                <summary>Veto power</summary>
                <p>
                  After 5 Fascist policies, the Chancellor may propose to veto the agenda. If the President agrees,
                  both policies are discarded and the Election Tracker advances. If not, the Chancellor must enact one.
                </p>
              </details>

              <details className={styles.section}>
                <summary>Reading the screen</summary>
                <ul>
                  <li>Your card is marked with a <span className={styles.youTag}>YOU</span> tag. Tap your name in the top bar to check your secret role again — you will be asked to make sure nobody is watching first.</li>
                  <li>During an election, the “…” bubble means the player is still deciding. When everyone has voted, the <b>ja!</b> / <b>nein!</b> bubbles show how each player voted.</li>
                  <li>The board never shows any role, not even yours, so your phone can lie on the table safely. All roles are revealed at the end of the game.</li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
