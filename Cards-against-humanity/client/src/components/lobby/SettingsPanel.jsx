import socket from '../../socket.js';

const REDRAW_LABELS = [
  { value: 0, label: 'Off' },
  { value: 1, label: '1' },
  { value: 3, label: '3' },
  { value: -1, label: '∞' },
];

export default function SettingsPanel({ settings, availableOptions, isHost }) {
  if (!settings) return null;

  const { languages = [], expansionsByLang = {} } = availableOptions;
  const packs = expansionsByLang[settings.lang] || [];
  const selected = packs.filter((p) => settings.expansions.includes(p.id));
  const totals = selected.reduce((t, p) => ({ black: t.black + p.black, white: t.white + p.white }), { black: 0, white: 0 });

  const update = (patch) => {
    if (!isHost) return;
    socket.emit('room:updateSettings', { ...settings, ...patch });
  };

  const setLang = (lang) => {
    if (lang === settings.lang) return;
    const langPacks = expansionsByLang[lang] || [];
    update({ lang, expansions: langPacks.length ? [langPacks[0].id] : [] });
  };

  const togglePack = (id) => {
    const has = settings.expansions.includes(id);
    if (has && settings.expansions.length === 1) return; // keep at least one pack
    update({ expansions: has ? settings.expansions.filter((p) => p !== id) : [...settings.expansions, id] });
  };

  return (
    <section className="settings" aria-label="Game settings">
      <div className="settings-head">
        <h3 className="section-title">Game settings</h3>
        {!isHost && <span className="muted small">Only the host can change these</span>}
      </div>

      <div className="setting">
        <span className="field-label">Language</span>
        <div className="segmented" role="radiogroup" aria-label="Language">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={settings.lang === l.code}
              className={`segment ${settings.lang === l.code ? 'is-on' : ''}`}
              disabled={!isHost}
              onClick={() => setLang(l.code)}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      <div className="setting">
        <span className="field-label">
          Card packs <span className="muted">· pick one or more</span>
        </span>
        <div className="packs">
          {packs.map((p) => {
            const on = settings.expansions.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={`pack ${on ? 'is-on' : ''}`}
                disabled={!isHost}
                onClick={() => togglePack(p.id)}
              >
                <span className="pack-check" aria-hidden="true">{on ? '✓' : ''}</span>
                <span className="pack-name">{p.name}</span>
                <span className="pack-count">{p.black} black · {p.white} white</span>
              </button>
            );
          })}
        </div>
        <span className="muted small">
          Deck: {totals.black} black · {totals.white} white cards
        </span>
      </div>

      <div className="setting">
        <span className="field-label">Hand redraws per player</span>
        <div className="segmented" role="radiogroup" aria-label="Hand redraws per player">
          {REDRAW_LABELS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={settings.redraws === r.value}
              className={`segment ${settings.redraws === r.value ? 'is-on' : ''}`}
              disabled={!isHost}
              onClick={() => update({ redraws: r.value })}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="muted small">Swap your whole hand for 7 new cards during a round.</span>
      </div>
    </section>
  );
}
