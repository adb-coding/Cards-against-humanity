import { useState, useEffect } from 'react';
import socket from './socket.js';
import LobbyScreen from './components/lobby/LobbyScreen.jsx';
import WaitingRoom from './components/lobby/WaitingRoom.jsx';
import GameScreen from './components/game/GameScreen.jsx';

// Per-round state, reset whenever a new round (or game) starts.
const freshRound = {
  submittedIds: [],
  totalNeeded: 0,
  mySubmission: null,
  submissions: [],
  submissionCount: 0,
  revealed: [],
  winningSubmissionId: null,
  authors: [],
  roundWinner: null,
  skipReason: null,
};

const initialState = {
  roomCode: null,
  playerId: null,
  playerName: null,
  hostId: null,
  phase: 'lobby',
  players: [],
  settings: null,
  czarId: null,
  currentBlackCard: null,
  myHand: [],
  redrawsLeft: 0,
  handVersion: 0,
  scores: {},
  roundNumber: 0,
  gameWinner: null,
  error: null,
  availableOptions: { languages: [], expansionsByLang: {} },
  ...freshRound,
};

export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | waiting | game
  const [gameState, setGameState] = useState(initialState);

  useEffect(() => {
    const on = (event, handler) => socket.on(event, handler);
    const update = (fn) => setGameState((s) => ({ ...s, ...fn(s) }));

    socket.connect();

    on('room:options', (options) => update(() => ({ availableOptions: options })));

    // ── Room events ──────────────────────────────────────────────────────
    on('room:created', (data) => {
      update(() => ({
        roomCode: data.roomCode,
        playerId: data.playerId,
        playerName: data.playerName,
        hostId: data.playerId,
        players: data.players,
        settings: data.settings,
        error: null,
      }));
      setScreen('waiting');
    });

    on('room:joined', (data) => {
      update(() => ({
        roomCode: data.roomCode,
        playerId: data.playerId,
        playerName: data.playerName,
        hostId: data.hostId,
        players: data.players,
        settings: data.settings,
        error: null,
      }));
      setScreen('waiting');
    });

    on('room:settings', ({ settings }) => update(() => ({ settings })));
    on('room:playerJoined', ({ players }) => update(() => ({ players })));
    on('room:playerLeft', ({ players }) => update(() => ({ players })));
    on('room:hostChanged', ({ newHostId }) => update(() => ({ hostId: newHostId })));
    on('room:error', ({ message }) => update(() => ({ error: message })));

    on('room:backToLobby', ({ players, hostId, settings }) => {
      update(() => ({
        ...freshRound,
        players,
        hostId,
        settings,
        phase: 'lobby',
        scores: {},
        roundNumber: 0,
        gameWinner: null,
        myHand: [],
        currentBlackCard: null,
      }));
      setScreen('waiting');
    });

    // ── Game events ──────────────────────────────────────────────────────
    on('game:started', (data) => {
      update(() => ({
        ...freshRound,
        phase: data.phase,
        roundNumber: data.round,
        czarId: data.czarId,
        currentBlackCard: data.blackCard,
        players: data.players,
        scores: data.scores,
        gameWinner: null,
      }));
      setScreen('game');
    });

    on('game:dealtHand', ({ hand, redrawsLeft, redrawn }) => {
      update((s) => ({ myHand: hand, redrawsLeft, handVersion: redrawn ? s.handVersion + 1 : s.handVersion }));
    });

    on('game:playerSubmitted', ({ submittedIds, totalNeeded }) => {
      update(() => ({ submittedIds, totalNeeded }));
    });

    on('game:allSubmitted', ({ phase, count }) => {
      update(() => ({ phase, submissionCount: count, revealed: [] }));
    });

    // During 'reading' only the Czar receives this; everyone gets the cards with game:judgingStarted.
    on('game:submissionsRevealed', ({ submissions }) => update(() => ({ submissions })));

    on('game:readingProgress', ({ revealed }) => update(() => ({ revealed })));

    on('game:judgingStarted', ({ phase, submissions }) => {
      update(() => ({ phase, submissions, submissionCount: submissions.length }));
    });

    on('game:roundWon', (data) => {
      update((s) => ({
        phase: data.phase,
        scores: data.scores,
        winningSubmissionId: data.winningSubmissionId,
        authors: data.authors,
        roundWinner: { id: data.winnerId, name: data.winnerName, cards: data.winningCards },
        players: s.players.map((p) => ({ ...p, score: data.scores[p.id] ?? p.score })),
      }));
    });

    on('game:nextRound', (data) => {
      update(() => ({
        ...freshRound,
        phase: data.phase,
        roundNumber: data.round,
        czarId: data.czarId,
        currentBlackCard: data.blackCard,
        scores: data.scores,
      }));
    });

    on('game:ended', ({ scores, winner }) => {
      update(() => ({ phase: 'ended', scores, gameWinner: winner }));
    });

    on('game:roundSkipped', ({ phase, scores, reason }) => {
      update(() => ({ ...freshRound, phase, scores, skipReason: reason }));
    });

    on('game:error', ({ message }) => update(() => ({ error: message })));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  // Auto-dismiss errors after a few seconds
  useEffect(() => {
    if (!gameState.error) return;
    const timer = setTimeout(() => setGameState((s) => ({ ...s, error: null })), 4000);
    return () => clearTimeout(timer);
  }, [gameState.error]);

  const clearError = () => setGameState((s) => ({ ...s, error: null }));

  const submitCards = (cards) => {
    setGameState((s) => ({ ...s, mySubmission: cards }));
    socket.emit('game:submitCards', { cardIds: cards.map((c) => c.id) });
  };

  return (
    <div className="app">
      {gameState.error && (
        <div className="toast toast--error" role="alert" onClick={clearError}>
          {gameState.error}
        </div>
      )}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'waiting' && <WaitingRoom gameState={gameState} />}
      {screen === 'game' && <GameScreen gameState={gameState} onSubmit={submitCards} />}
    </div>
  );
}
