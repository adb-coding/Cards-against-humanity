import { ROLES, type GameView, type RoleId } from 'lupus-shared';
import { CardFace, Modal } from '../ui.js';

const ALL_ROLES: RoleId[] = [
  'villico',
  'lupo',
  'veggente',
  'medium',
  'guardia',
  'prostituta',
  'cacciatore',
  'massone',
  'criceto',
  'mitomane',
];

/** The rulebook. During a game it lists the cards actually dealt and the rules chosen by the host. */
export function RulesModal({ view, onClose }: { view?: GameView; onClose: () => void }) {
  const deck = view?.deck ?? null;
  const roles = deck ? ALL_ROLES.filter((r) => deck[r] > 0) : ALL_ROLES;
  const settings = view?.settings;

  return (
    <Modal title="Regolamento" onClose={onClose} wide>
      <section className="rules">
        <h3>Lo scopo</h3>
        <p>
          A Tabula si nascondono dei <strong>lupi mannari</strong>. Ogni notte sbranano un abitante; ogni giorno il
          villaggio discute e <strong>lapida</strong> chi sospetta. Il <strong>villaggio</strong> vince quando tutti i
          lupi sono morti. I <strong>lupi</strong> vincono quando sono tanti quanti gli altri abitanti ancora vivi.
        </p>

        <h3>La notte</h3>
        <p>
          Tutti chiudono gli occhi. Il narratore chiama un ruolo alla volta: chi viene chiamato vede sul proprio telefono
          cosa può fare e tocca il giocatore che sceglie. Anche i ruoli già morti vengono chiamati, così nessuno può capire
          chi manca. Tutte le scelte si avverano insieme, all’alba.
        </p>
        <ol>
          <li>Massoni (solo la prima notte)</li>
          <li>Medium (dalla seconda notte)</li>
          <li>Prostituta</li>
          <li>Guardia</li>
          <li>Veggente</li>
          <li>Lupi Mannari</li>
          <li>Cacciatore</li>
          <li>Mitomane (solo la prima notte)</li>
        </ol>

        <h3>Il giorno</h3>
        <p>
          All’alba il narratore annuncia chi è morto, senza rivelarne il ruolo né la causa. Poi si discute e si vota:
          ognuno tocca il giocatore che vuole lapidare e può cambiare idea finché il master non chiude la votazione. Chi
          riceve più voti viene lapidato.
        </p>
        <p>
          In caso di <strong>parità</strong> si va al ballottaggio fra i giocatori a pari merito, che non votano. Se
          anche il ballottaggio finisce pari, o se nessuno vota, quel giorno non muore nessuno.
        </p>
        <p>
          I morti diventano fantasmi: non votano, non parlano e non possono rivelare la propria carta.
        </p>

        {settings && (
          <>
            <h3>In questa partita</h3>
            <ul>
              <li>
                Narratore:{' '}
                {settings.narrator === 'auto'
                  ? 'automatico. Il master dà il via alle fasi ma gioca come tutti e non conosce i ruoli degli altri.'
                  : 'un giocatore, che non ha una carta, vede tutti i ruoli e chiama i turni della notte.'}
              </li>
              <li>Votazione: {settings.secretVote ? 'segreta (si vede solo il conteggio finale).' : 'palese.'}</li>
              <li>
                Discussione:{' '}
                {settings.discussionSeconds > 0
                  ? `${Math.round(settings.discussionSeconds / 60)} minuti (il master apre la votazione quando vuole).`
                  : 'senza limite di tempo.'}
              </li>
            </ul>
          </>
        )}

        <h3>{deck ? 'Le carte in gioco' : 'I ruoli'}</h3>
        <ul className="rules-roles">
          {roles.map((role) => (
            <li key={role}>
              <CardFace role={role} className="card-thumb" />
              <div>
                <h4>
                  {ROLES[role].name}
                  {deck && <span className="count"> ×{deck[role]}</span>}
                </h4>
                <p>{ROLES[role].power}</p>
                <p className="goal">{ROLES[role].goal}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Modal>
  );
}
