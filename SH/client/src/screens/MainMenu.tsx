import { useState } from 'react';
import { useGame } from '../context/GameContext.js';
import { Button } from '../components/Button.js';
import { TextInput } from '../components/TextInput.js';
import { INITIAL_PLAYER_NAME, MENU_URL } from '../tableNight.js';
import styles from '../styles/MainMenu.module.css';

export function MainMenu() {
  const { state, createGame, joinGame } = useGame();
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [name, setName] = useState(INITIAL_PLAYER_NAME);
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === 'create') {
      createGame(name.trim());
    } else if (mode === 'join') {
      if (!roomCode.trim()) return;
      joinGame(name.trim(), roomCode.trim());
    }
  };

  return (
    <div className={styles.container}>
      <a href={MENU_URL} className={styles.menuLink}>← All games</a>
      <h1 className={styles.title}>SECRET HITLER</h1>
      <p className={styles.subtitle}>DIGITAL DOSSIER</p>

      {mode === 'idle' && (
        <div className={styles.actions}>
          <Button onClick={() => setMode('create')}>Create Game</Button>
          <Button variant="secondary" onClick={() => setMode('join')}>
            Join Game
          </Button>
        </div>
      )}

      {mode !== 'idle' && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <TextInput
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus={!name}
          />
          {mode === 'join' && (
            <TextInput
              placeholder="Room code"
            autoCapitalize="characters"
            autoComplete="off"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              autoFocus={!!name}
            />
          )}
          <Button type="submit" disabled={!name.trim() || (mode === 'join' && !roomCode.trim())}>
            {mode === 'create' ? 'Create' : 'Join'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMode('idle')}>
            Back
          </Button>
          {state.error && <p className={styles.error}>{state.error}</p>}
        </form>
      )}
    </div>
  );
}
