import { useGame } from './context/GameContext.js';
import { MainMenu } from './screens/MainMenu.js';
import { Lobby } from './screens/Lobby.js';
import { DossierReveal } from './screens/DossierReveal.js';
import { GameBoard } from './screens/GameBoard.js';
import { HelpButton } from './components/HelpButton.js';

function Screen() {
  const { state } = useGame();

  switch (state.screen) {
    case 'menu':
      return <MainMenu />;
    case 'lobby':
      return <Lobby />;
    case 'dossier-reveal':
      return <DossierReveal />;
    case 'game-board':
      return <GameBoard />;
  }
}

export function App() {
  const { state } = useGame();
  const playerCount = state.boardState?.playerCount ?? (state.players.length || undefined);

  return (
    <>
      <HelpButton playerCount={playerCount} />
      <Screen />
    </>
  );
}
