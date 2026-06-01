import { useState, useEffect } from 'react';
import socket from './socket.js';
import LobbyScreen from './components/lobby/LobbyScreen.jsx';
import WaitingRoom from './components/lobby/WaitingRoom.jsx';
import GameScreen from './components/game/GameScreen.jsx';

const INITIAL_GAME_STATE = {
  roomCode: null,
  playerId: null,
  playerName: null,
  hostId: null,
  phase: 'lobby',
  players: [],
  czarId: null,
  currentBlackCard: null,
  myHand: [],
  submissions: [],
  scores: {},
  roundWinner: null,
  roundNumber: 0,
  gameWinner: null,
  submittedCount: 0,
  totalNeeded: 0,
  hasSubmitted: false,
  maxRedraws: 1,
  myRedraws: 0,
  error: null,
  availableOptions: { languages: [], expansionsByLang: {} },
};

export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | waiting | game
  const [gameState, setGameState] = useState(INITIAL_GAME_STATE);

  useEffect(() => {
    socket.connect();

    socket.on('room:options', (options) => {
      setGameState((s) => ({ ...s, availableOptions: options }));
    });

    // ── Room events ──────────────────────────────────────────────────────
    socket.on('room:created', (data) => {
      sessionStorage.setItem('cah_session', JSON.stringify({ roomCode: data.roomCode, playerName: data.playerName }));
      setGameState((s) => ({
        ...s,
        roomCode: data.roomCode,
        playerId: data.playerId,
        playerName: data.playerName,
        hostId: data.playerId,
        players: data.players,
      }));
      setScreen('waiting');
    });

    socket.on('room:joined', (data) => {
      sessionStorage.setItem('cah_session', JSON.stringify({ roomCode: data.roomCode, playerName: data.playerName }));
      setGameState((s) => ({
        ...s,
        roomCode: data.roomCode,
        playerId: data.playerId,
        playerName: data.playerName,
        hostId: data.hostId,
        players: data.players,
      }));
      setScreen('waiting');
    });

    socket.on('room:rejoined', (data) => {
      sessionStorage.setItem('cah_session', JSON.stringify({ roomCode: data.roomCode, playerName: data.playerName }));
      setGameState((s) => ({
        ...s,
        roomCode: data.roomCode,
        playerId: data.playerId,
        playerName: data.playerName,
        hostId: data.hostId,
        players: data.players,
        phase: data.phase,
        roundNumber: data.round ?? 0,
        czarId: data.czarId ?? null,
        currentBlackCard: data.blackCard ?? null,
        scores: data.scores ?? {},
        myHand: data.hand ?? [],
        maxRedraws: data.maxRedraws ?? 1,
        myRedraws: data.myRedraws ?? 0,
        hasSubmitted: data.hasSubmitted ?? false,
        submittedCount: data.submittedCount ?? 0,
        totalNeeded: data.totalNeeded ?? 0,
        submissions: data.submissions ?? [],
        roundWinner: data.roundWinner ?? null,
      }));
      setScreen(data.phase === 'lobby' ? 'waiting' : 'game');
    });

    socket.on('room:rejoinFailed', () => {
      sessionStorage.removeItem('cah_session');
      setScreen('lobby');
    });

    // Try to rejoin after connecting
    socket.on('connect', () => {
      const saved = sessionStorage.getItem('cah_session');
      if (saved) {
        try {
          const { roomCode, playerName } = JSON.parse(saved);
          socket.emit('room:rejoin', { roomCode, playerName });
        } catch {
          sessionStorage.removeItem('cah_session');
        }
      }
    });

    socket.on('room:playerJoined', ({ players }) => {
      setGameState((s) => ({ ...s, players }));
    });

    socket.on('room:playerLeft', ({ players }) => {
      setGameState((s) => ({ ...s, players }));
    });

    socket.on('room:hostChanged', ({ newHostId }) => {
      setGameState((s) => ({ ...s, hostId: newHostId }));
    });

    socket.on('room:error', ({ message }) => {
      setGameState((s) => ({ ...s, error: message }));
    });

    // ── Game events ──────────────────────────────────────────────────────
    socket.on('game:started', (data) => {
      setGameState((s) => ({
        ...s,
        phase: data.phase,
        roundNumber: data.round,
        czarId: data.czarId,
        currentBlackCard: data.blackCard,
        players: data.players,
        scores: data.scores,
        submissions: [],
        roundWinner: null,
        hasSubmitted: false,
        submittedCount: 0,
        totalNeeded: 0,
        maxRedraws: data.maxRedraws ?? 1,
        myRedraws: 0,
      }));
      setScreen('game');
    });

    socket.on('game:dealtHand', ({ hand }) => {
      setGameState((s) => ({ ...s, myHand: hand }));
    });

    socket.on('game:handRedrawn', ({ hand, redraws, maxRedraws }) => {
      setGameState((s) => ({ ...s, myHand: hand, myRedraws: redraws, maxRedraws }));
    });

    socket.on('game:playerSubmitted', ({ submittedCount, totalNeeded }) => {
      setGameState((s) => ({ ...s, submittedCount, totalNeeded }));
    });

    socket.on('game:allSubmitted', ({ phase }) => {
      setGameState((s) => ({ ...s, phase }));
    });

    socket.on('game:submissionsRevealed', ({ submissions }) => {
      setGameState((s) => ({ ...s, submissions }));
    });

    socket.on('game:roundWon', (data) => {
      setGameState((s) => ({
        ...s,
        phase: data.phase,
        scores: data.scores,
        roundWinner: { id: data.winnerId, name: data.winnerName, cards: data.winningCards },
        players: s.players.map((p) => ({ ...p, score: data.scores[p.id] ?? p.score })),
      }));
    });

    socket.on('game:nextRound', (data) => {
      setGameState((s) => ({
        ...s,
        phase: data.phase,
        roundNumber: data.round,
        czarId: data.czarId,
        currentBlackCard: data.blackCard,
        scores: data.scores,
        submissions: [],
        roundWinner: null,
        hasSubmitted: false,
        submittedCount: 0,
        totalNeeded: 0,
      }));
    });

    socket.on('game:ended', ({ scores, winner }) => {
      sessionStorage.removeItem('cah_session');
      setGameState((s) => ({ ...s, phase: 'ended', scores, gameWinner: winner }));
    });

    socket.on('game:roundSkipped', ({ phase, scores }) => {
      setGameState((s) => ({
        ...s,
        phase,
        scores,
        roundWinner: null,
        submissions: [],
        hasSubmitted: false,
      }));
    });

    socket.on('game:error', ({ message }) => {
      setGameState((s) => ({ ...s, error: message }));
    });

    return () => {
      socket.off('connect');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:rejoined');
      socket.off('room:rejoinFailed');
      socket.off('room:playerJoined');
      socket.off('room:playerLeft');
      socket.off('room:hostChanged');
      socket.off('room:error');
      socket.off('game:started');
      socket.off('game:dealtHand');
      socket.off('game:handRedrawn');
      socket.off('game:playerSubmitted');
      socket.off('game:allSubmitted');
      socket.off('game:submissionsRevealed');
      socket.off('game:roundWon');
      socket.off('game:nextRound');
      socket.off('game:ended');
      socket.off('game:roundSkipped');
      socket.off('game:error');
      socket.disconnect();
    };
  }, []);

  const clearError = () => setGameState((s) => ({ ...s, error: null }));

  const markSubmitted = () => setGameState((s) => ({ ...s, hasSubmitted: true }));

  const handleExit = () => {
    sessionStorage.removeItem('cah_session');
    socket.emit('room:leave');
    setGameState((s) => ({ ...INITIAL_GAME_STATE, availableOptions: s.availableOptions }));
    setScreen('lobby');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff' }}>
      {gameState.error && (
        <div style={styles.errorBanner}>
          {gameState.error}
          <button onClick={clearError} style={styles.errorClose}>✕</button>
        </div>
      )}
      {screen === 'lobby' && <LobbyScreen availableOptions={gameState.availableOptions} />}
      {screen === 'waiting' && <WaitingRoom gameState={gameState} onExit={handleExit} />}
      {screen === 'game' && <GameScreen gameState={gameState} onSubmitted={markSubmitted} onExit={handleExit} />}
    </div>
  );
}

const styles = {
  errorBanner: {
    background: '#c0392b',
    color: '#fff',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 16,
  },
};
