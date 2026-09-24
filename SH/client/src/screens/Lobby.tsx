import { useGame } from '../context/GameContext.js';
import { Button } from '../components/Button.js';
import { MIN_PLAYERS, MAX_PLAYERS } from 'shared';
import { socket } from '../socket.js';
import styles from '../styles/Lobby.module.css';

export function Lobby() {
  const { state, startGame, leaveRoom } = useGame();
  const canStart = state.isHost && state.players.length >= MIN_PLAYERS;
  const missing = MIN_PLAYERS - state.players.length;

  return (
    <div className={styles.container}>
      <div className={styles.roomCodeLabel}>Room Code</div>
      <div className={styles.roomCode}>{state.roomCode}</div>
      <p className={styles.hint}>Share this code with the other players.</p>

      <h2 className={styles.heading}>
        Operatives ({state.players.length}/{MAX_PLAYERS})
      </h2>

      <ul className={styles.playerList}>
        {state.players.map((p) => (
          <li key={p.id} className={`${styles.playerCard} ${p.id === socket.id ? styles.me : ''}`}>
            <span className={styles.name}>
              {p.name}
              {p.id === socket.id && <span className={styles.youTag}>You</span>}
            </span>
            {p.isHost && <span className={styles.hostBadge}>Host</span>}
          </li>
        ))}
      </ul>

      {missing > 0 && (
        <p className={styles.waiting}>
          Waiting for {missing} more operative{missing !== 1 ? 's' : ''}…
        </p>
      )}

      <div className={styles.actions}>
        {state.isHost ? (
          <Button onClick={startGame} disabled={!canStart}>
            Start Game
          </Button>
        ) : (
          <p className={styles.waiting}>Waiting for the host to start…</p>
        )}
        <Button variant="secondary" onClick={leaveRoom}>
          Leave Room
        </Button>
      </div>
      {state.error && <p className={styles.waiting}>{state.error}</p>}
    </div>
  );
}
