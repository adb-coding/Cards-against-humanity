import { useState } from 'react';
import socket from '../../socket.js';
import { INITIAL_PLAYER_NAME, MENU_URL, savePlayerName } from '../../tableNight.js';

export default function LobbyScreen() {
  const [view, setView] = useState('home'); // home | join
  const [name, setName] = useState(INITIAL_PLAYER_NAME);
  const [code, setCode] = useState('');

  const trimmed = name.trim();

  const handleCreate = () => {
    if (!trimmed) return;
    savePlayerName(trimmed);
    socket.emit('room:create', { playerName: trimmed });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!trimmed || code.trim().length < 6) return;
    savePlayerName(trimmed);
    socket.emit('room:join', { playerName: trimmed, roomCode: code.trim().toUpperCase() });
  };

  return (
    <div className="screen screen--center">
      <a href={MENU_URL} className="menu-link">← All games</a>

      <div className="hero">
        <div className="hero-card hero-card--black">
          Cards Against Humanity
        </div>
        <div className="hero-card hero-card--white">A party game for horrible people.</div>
      </div>

      <div className="panel">
        <label className="field">
          <span className="field-label">Your name</span>
          <input
            className="input"
            placeholder="e.g. Card Czar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus={!name}
            autoComplete="nickname"
          />
        </label>

        {view === 'home' && (
          <div className="stack">
            <button className="btn btn--primary" disabled={!trimmed} onClick={handleCreate}>
              Create a room
            </button>
            <button className="btn btn--ghost" onClick={() => setView('join')}>
              Join with a code
            </button>
          </div>
        )}

        {view === 'join' && (
          <form className="stack" onSubmit={handleJoin}>
            <label className="field">
              <span className="field-label">Room code</span>
              <input
                className="input input--code"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={6}
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
              />
            </label>
            <button className="btn btn--primary" type="submit" disabled={!trimmed || code.length < 6}>
              Join room
            </button>
            <button className="btn btn--link" type="button" onClick={() => setView('home')}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
