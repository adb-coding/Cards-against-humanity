import { Game } from './screens/Game.js';
import { Home } from './screens/Home.js';
import { Lobby } from './screens/Lobby.js';
import { useLupus } from './store.js';
import { backgroundUrl } from './ui.js';

export function App() {
  const { status, view, online, notice, dismissNotice } = useLupus();

  let screen;
  if (status === 'room' && view) {
    screen = view.phase === 'lobby' ? <Lobby view={view} /> : <Game view={view} />;
  } else if (status === 'connecting') {
    screen = (
      <div className="page page-center" style={{ backgroundImage: `url(${backgroundUrl('night')})` }}>
        <div className="page-veil" />
        <p className="loading">Si cerca la strada per Tabula…</p>
      </div>
    );
  } else {
    screen = <Home />;
  }

  return (
    <>
      {screen}
      {status !== 'connecting' && !online && (
        <div className="offline" role="status">
          Connessione persa: riconnessione in corso…
        </div>
      )}
      {notice && (
        <button type="button" className="toast" key={notice.id} onClick={dismissNotice}>
          {notice.message}
        </button>
      )}
    </>
  );
}
