import { useState, useEffect } from 'react';
import socket from './socket.js';
import LobbyScreen from './components/lobby/LobbyScreen.jsx';
import WaitingRoom from './components/lobby/WaitingRoom.jsx';
import GameScreen from './components/game/GameScreen.jsx';

export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | waiting | game
  const [gameState, setGameState] = useState({
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
  });

  useEffect(() => {
    socket.connect();

    socket.on('room:options', (options) => {
      setGameState((s) => ({ ...s, availableOptions: options }));
    });

    // ── Room events ──────────────────────────────────────────────────────
    socket.on('room:created', (data) => {
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
      socket.off('room:created');
      socket.off('room:joined');
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

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff' }}>
      {gameState.error && (
        <div style={styles.errorBanner}>
          {gameState.error}
          <button onClick={clearError} style={styles.errorClose}>✕</button>
        </div>
      )}
      {screen === 'lobby' && <LobbyScreen availableOptions={gameState.availableOptions} />}
      {screen === 'waiting' && <WaitingRoom gameState={gameState} />}
      {screen === 'game' && <GameScreen gameState={gameState} onSubmitted={markSubmitted} />}
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
