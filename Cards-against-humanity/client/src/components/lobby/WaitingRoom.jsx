import { useState } from 'react';
import socket from '../../socket.js';
import { MENU_URL } from '../../tableNight.js';
import SettingsPanel from './SettingsPanel.jsx';

export default function WaitingRoom({ gameState }) {
  const { roomCode, playerId, hostId, players, settings, availableOptions } = gameState;
  const isHost = playerId === hostId;
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — the code is on screen anyway.
    }
  };

  return (
    <div className="screen">
      <a href={MENU_URL} className="menu-link">← All games</a>

      <div className="waiting">
        <button type="button" className="code-box" onClick={copyCode} aria-label={`Room code ${roomCode}, tap to copy`}>
          <span className="field-label">Room code</span>
          <span className="code">{roomCode}</span>
          <span className="muted small">{copied ? 'Copied!' : 'Tap to copy · share it with your friends'}</span>
        </button>

        <section>
          <h3 className="section-title">
            Players <span className="muted">{players.length}/10</span>
          </h3>
          <ul className="lobby-players">
            {players.map((p) => (
              <li key={p.id} className={`lobby-player ${p.id === playerId ? 'is-me' : ''}`}>
                <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
                <span className="lobby-player-name">{p.name}</span>
                {p.id === playerId && <span className="tag tag--you">You</span>}
                {p.id === hostId && <span className="tag tag--host">Host</span>}
              </li>
            ))}
          </ul>
        </section>

        <SettingsPanel settings={settings} availableOptions={availableOptions} isHost={isHost} />
      </div>

      <div className="action-bar">
        {isHost ? (
          <button className="btn btn--primary btn--block" onClick={() => socket.emit('game:start')} disabled={players.length < 2}>
            {players.length < 2 ? 'Waiting for players…' : `Start game · ${players.length} players`}
          </button>
        ) : (
          <p className="action-note">Waiting for the host to start the game…</p>
        )}
      </div>
    </div>
  );
}
