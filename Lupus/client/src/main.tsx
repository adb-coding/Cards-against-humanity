import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { LupusProvider } from './store.js';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LupusProvider>
      <App />
    </LupusProvider>
  </StrictMode>,
);
