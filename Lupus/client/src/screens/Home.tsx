import { useState, type FormEvent } from 'react';
import { useLupus } from '../store.js';
import { INITIAL_PLAYER_NAME, MENU_URL } from '../tableNight.js';
import { backgroundUrl, Button } from '../ui.js';
import { RulesModal } from './Rules.js';

export function Home() {
  const { create, join, error, busy, online } = useLupus();
  const [name, setName] = useState(INITIAL_PLAYER_NAME);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [rules, setRules] = useState(false);

  const ready = name.trim().length > 0 && (mode === 'create' || roomCode.trim().length === 4);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    if (mode === 'create') create(name.trim());
    else join(name.trim(), roomCode.trim());
  };

  return (
    <div className="page" style={{ backgroundImage: `url(${backgroundUrl('night')})` }}>
      <div className="page-veil" />
      <header className="page-bar">
        <a href={MENU_URL} className="link-back">
          ← Tutti i giochi
        </a>
        <button type="button" className="icon-btn" onClick={() => setRules(true)} aria-label="Regolamento">
          i
        </button>
      </header>

      <main className="home">
        <div className="home-title">
          <p className="eyebrow">Il villaggio di Tabula ti attende</p>
          <h1>
            Lupus <span>in</span> Tabula
          </h1>
        </div>

        <form className="parchment home-form" onSubmit={submit}>
          <div className="segmented" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'create'} onClick={() => setMode('create')}>
              Crea stanza
            </button>
            <button type="button" role="tab" aria-selected={mode === 'join'} onClick={() => setMode('join')}>
              Entra
            </button>
          </div>

          <label className="field">
            <span>Il tuo nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Come ti chiamano in paese?"
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint={mode === 'create' ? 'go' : 'next'}
            />
          </label>

          {mode === 'join' && (
            <label className="field">
              <span>Codice della stanza</span>
              <input
                className="input-code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                maxLength={4}
                placeholder="ABCD"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
            </label>
          )}

          <Button type="submit" disabled={!ready || busy || !online}>
            {mode === 'create' ? 'Crea la stanza' : 'Entra nella stanza'}
          </Button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="form-hint">
            {mode === 'create'
              ? 'Crea la stanza e condividi il codice con gli altri: sceglierai tu carte e regole.'
              : 'Se eri già in partita, entra con lo stesso nome per riprendere il tuo posto.'}
          </p>
        </form>
      </main>

      {rules && <RulesModal onClose={() => setRules(false)} />}
    </div>
  );
}
