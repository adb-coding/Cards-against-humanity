import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './context/GameContext.js';
import { App } from './App.js';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
