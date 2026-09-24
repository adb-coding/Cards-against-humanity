import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type {
  LobbyPlayer,
  DossierRevealPayload,
  GameBoardState,
  ElectionResult,
  PolicyType,
  GameOverPayload,
  InvestigationPayload,
  Vote,
  VetoResponse,
} from 'shared';
import { socket } from '../socket.js';
import { savePlayerName } from '../tableNight.js';

type Screen = 'menu' | 'lobby' | 'dossier-reveal' | 'game-board';

interface GameState {
  screen: Screen;
  roomCode: string | null;
  players: LobbyPlayer[];
  isHost: boolean;
  dossier: DossierRevealPayload | null;
  error: string | null;
  boardState: GameBoardState | null;
  electionResult: ElectionResult | null;
  presidentPolicies: PolicyType[] | null;
  chancellorPolicies: PolicyType[] | null;
  canVeto: boolean;
  policyPeekPolicies: PolicyType[] | null;
  investigationResult: InvestigationPayload | null;
  gameOverData: GameOverPayload | null;
  lastEnactedNotification: { policy: PolicyType; slot: number } | null;
  chaosNotification: { enactedPolicy: PolicyType; slot: number } | null;
  vetoRequested: boolean;
  executiveActionNotification: { action: string; presidentName: string; targetName?: string } | null;
}

type Action =
  | { type: 'LOBBY_CREATED'; roomCode: string; players: LobbyPlayer[] }
  | { type: 'LOBBY_JOINED'; roomCode: string; players: LobbyPlayer[] }
  | { type: 'PLAYERS_UPDATED'; players: LobbyPlayer[] }
  | { type: 'GAME_STARTED' }
  | { type: 'DOSSIER_REVEAL'; dossier: DossierRevealPayload }
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'BACK_TO_MENU' }
  | { type: 'ENTER_GAME_BOARD' }
  | { type: 'BOARD_STATE_UPDATE'; boardState: GameBoardState }
  | { type: 'ELECTION_RESULT'; result: ElectionResult }
  | { type: 'PRESIDENT_DRAW'; policies: PolicyType[] }
  | { type: 'CHANCELLOR_RECEIVE'; policies: PolicyType[]; canVeto: boolean }
  | { type: 'POLICY_ENACTED'; policy: PolicyType; slot: number }
  | { type: 'POLICY_PEEK'; policies: PolicyType[] }
  | { type: 'INVESTIGATION_RESULT'; result: InvestigationPayload }
  | { type: 'VETO_REQUESTED' }
  | { type: 'GAME_OVER'; data: GameOverPayload }
  | { type: 'CHAOS'; enactedPolicy: PolicyType; slot: number }
  | { type: 'EXECUTIVE_ACTION_NOTIFICATION'; action: string; presidentName: string; targetName?: string }
  | { type: 'CLEAR_MODAL' }
  | { type: 'CLEAR_TOAST' };

const initialState: GameState = {
  screen: 'menu',
  roomCode: null,
  players: [],
  isHost: false,
  dossier: null,
  error: null,
  boardState: null,
  electionResult: null,
  presidentPolicies: null,
  chancellorPolicies: null,
  canVeto: false,
  policyPeekPolicies: null,
  investigationResult: null,
  gameOverData: null,
  lastEnactedNotification: null,
  chaosNotification: null,
  vetoRequested: false,
  executiveActionNotification: null,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'LOBBY_CREATED':
      return {
        ...state,
        screen: 'lobby',
        roomCode: action.roomCode,
        players: action.players,
        isHost: true,
        error: null,
      };
    case 'LOBBY_JOINED':
      return {
        ...state,
        screen: 'lobby',
        roomCode: action.roomCode,
        players: action.players,
        isHost: false,
        error: null,
      };
    case 'PLAYERS_UPDATED':
      return {
        ...state,
        players: action.players,
        isHost: action.players.some((p) => p.id === socket.id && p.isHost),
      };
    case 'GAME_STARTED':
      return {
        ...state,
        screen: 'dossier-reveal',
        dossier: null,
        boardState: null,
        electionResult: null,
        presidentPolicies: null,
        chancellorPolicies: null,
        canVeto: false,
        policyPeekPolicies: null,
        investigationResult: null,
        gameOverData: null,
        lastEnactedNotification: null,
        chaosNotification: null,
        vetoRequested: false,
        executiveActionNotification: null,
      };
    case 'DOSSIER_REVEAL':
      return { ...state, dossier: action.dossier };
    case 'ERROR':
      return { ...state, error: action.message };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'BACK_TO_MENU':
      return { ...initialState };
    case 'ENTER_GAME_BOARD':
      return { ...state, screen: 'game-board' };
    case 'BOARD_STATE_UPDATE': {
      // Private hands only survive while their phase lasts; unrelated updates
      // (e.g. vote progress) must not wipe them.
      const phase = action.boardState.phase;
      return {
        ...state,
        boardState: action.boardState,
        presidentPolicies: phase === 'legislative-president' ? state.presidentPolicies : null,
        chancellorPolicies: phase === 'legislative-chancellor' || phase === 'veto-requested' ? state.chancellorPolicies : null,
        canVeto: phase === 'legislative-chancellor' ? state.canVeto : false,
        vetoRequested: phase === 'veto-requested' ? state.vetoRequested : false,
      };
    }
    case 'ELECTION_RESULT':
      return { ...state, electionResult: action.result };
    case 'PRESIDENT_DRAW':
      return { ...state, presidentPolicies: action.policies };
    case 'CHANCELLOR_RECEIVE':
      return { ...state, chancellorPolicies: action.policies, canVeto: action.canVeto };
    case 'POLICY_ENACTED':
      return { ...state, lastEnactedNotification: { policy: action.policy, slot: action.slot } };
    case 'POLICY_PEEK':
      return { ...state, policyPeekPolicies: action.policies };
    case 'INVESTIGATION_RESULT':
      return { ...state, investigationResult: action.result };
    case 'VETO_REQUESTED':
      return { ...state, vetoRequested: true };
    case 'GAME_OVER':
      return { ...state, gameOverData: action.data };
    case 'CHAOS':
      return { ...state, chaosNotification: { enactedPolicy: action.enactedPolicy, slot: action.slot } };
    case 'EXECUTIVE_ACTION_NOTIFICATION':
      return { ...state, executiveActionNotification: { action: action.action, presidentName: action.presidentName, targetName: action.targetName } };
    case 'CLEAR_MODAL':
      return {
        ...state,
        electionResult: null,
        lastEnactedNotification: null,
        chaosNotification: null,
        policyPeekPolicies: null,
        investigationResult: null,
      };
    case 'CLEAR_TOAST':
      return { ...state, executiveActionNotification: null };
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  createGame: (name: string) => void;
  joinGame: (name: string, roomCode: string) => void;
  startGame: () => void;
  dossierReady: () => void;
  nominateChancellor: (targetId: string) => void;
  castVote: (vote: Vote) => void;
  presidentDiscard: (index: number) => void;
  chancellorEnact: (index: number) => void;
  requestVeto: () => void;
  vetoResponse: (response: VetoResponse) => void;
  investigatePlayer: (targetId: string) => void;
  specialElection: (targetId: string) => void;
  executePlayer: (targetId: string) => void;
  policyPeekAcknowledge: () => void;
  playAgain: () => void;
  leaveRoom: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    socket.connect();

    socket.on('lobby:created', (data) => {
      dispatch({ type: 'LOBBY_CREATED', roomCode: data.roomCode, players: data.players });
    });
    socket.on('lobby:joined', (data) => {
      dispatch({ type: 'LOBBY_JOINED', roomCode: data.roomCode, players: data.players });
    });
    socket.on('lobby:player-joined', (data) => {
      dispatch({ type: 'PLAYERS_UPDATED', players: data.players });
    });
    socket.on('lobby:player-left', (data) => {
      dispatch({ type: 'PLAYERS_UPDATED', players: data.players });
    });
    socket.on('lobby:error', (data) => {
      dispatch({ type: 'ERROR', message: data.message });
    });
    socket.on('game:started', () => {
      dispatch({ type: 'GAME_STARTED' });
    });
    socket.on('game:dossier-reveal', (data) => {
      dispatch({ type: 'DOSSIER_REVEAL', dossier: data });
    });
    socket.on('game:state-update', (data) => {
      dispatch({ type: 'BOARD_STATE_UPDATE', boardState: data });
    });
    socket.on('game:election-result', (data) => {
      dispatch({ type: 'ELECTION_RESULT', result: data });
    });
    socket.on('game:president-draw', (data) => {
      dispatch({ type: 'PRESIDENT_DRAW', policies: data.drawnPolicies });
    });
    socket.on('game:chancellor-receive', (data) => {
      dispatch({ type: 'CHANCELLOR_RECEIVE', policies: data.receivedPolicies, canVeto: data.canVeto });
    });
    socket.on('game:policy-enacted', (data) => {
      dispatch({ type: 'POLICY_ENACTED', policy: data.policy, slot: data.slot });
    });
    socket.on('game:policy-peek', (data) => {
      dispatch({ type: 'POLICY_PEEK', policies: data.topPolicies });
    });
    socket.on('game:investigation-result', (data) => {
      dispatch({ type: 'INVESTIGATION_RESULT', result: data });
    });
    socket.on('game:veto-request', () => {
      dispatch({ type: 'VETO_REQUESTED' });
    });
    socket.on('game:over', (data) => {
      dispatch({ type: 'GAME_OVER', data });
    });
    socket.on('game:chaos', (data) => {
      dispatch({ type: 'CHAOS', enactedPolicy: data.enactedPolicy, slot: data.slot });
    });
    socket.on('game:executive-action-notification', (data) => {
      dispatch({ type: 'EXECUTIVE_ACTION_NOTIFICATION', action: data.action, presidentName: data.presidentName, targetName: data.targetName });
    });

    return () => {
      socket.off('lobby:created');
      socket.off('lobby:joined');
      socket.off('lobby:player-joined');
      socket.off('lobby:player-left');
      socket.off('lobby:error');
      socket.off('game:started');
      socket.off('game:dossier-reveal');
      socket.off('game:state-update');
      socket.off('game:election-result');
      socket.off('game:president-draw');
      socket.off('game:chancellor-receive');
      socket.off('game:policy-enacted');
      socket.off('game:policy-peek');
      socket.off('game:investigation-result');
      socket.off('game:veto-request');
      socket.off('game:over');
      socket.off('game:chaos');
      socket.off('game:executive-action-notification');
      socket.disconnect();
    };
  }, []);

  const createGame = (name: string) => {
    dispatch({ type: 'CLEAR_ERROR' });
    savePlayerName(name);
    socket.emit('lobby:create', { playerName: name });
  };

  const joinGame = (name: string, roomCode: string) => {
    dispatch({ type: 'CLEAR_ERROR' });
    savePlayerName(name);
    socket.emit('lobby:join', { playerName: name, roomCode });
  };

  const startGame = () => socket.emit('lobby:start-game');
  const dossierReady = () => socket.emit('game:dossier-ready');
  const nominateChancellor = (targetId: string) => socket.emit('game:nominate-chancellor', { targetId });
  const castVote = (vote: Vote) => socket.emit('game:cast-vote', { vote });
  const presidentDiscard = (index: number) => socket.emit('game:president-discard', { discardIndex: index });
  const chancellorEnact = (index: number) => socket.emit('game:chancellor-enact', { enactIndex: index });
  const requestVeto = () => socket.emit('game:request-veto');
  const vetoResponse = (response: VetoResponse) => socket.emit('game:veto-response', { response });
  const investigatePlayer = (targetId: string) => socket.emit('game:investigate-player', { targetId });
  const specialElection = (targetId: string) => socket.emit('game:special-election', { targetId });
  const executePlayer = (targetId: string) => socket.emit('game:execute-player', { targetId });
  const policyPeekAcknowledge = () => socket.emit('game:policy-peek-acknowledge');
  const playAgain = () => socket.emit('game:play-again');
  const leaveRoom = () => {
    // Drop out of the room server-side (disconnect handler removes the player),
    // then reconnect with a fresh socket and return to the menu.
    socket.disconnect();
    socket.connect();
    dispatch({ type: 'BACK_TO_MENU' });
  };

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        createGame,
        joinGame,
        startGame,
        dossierReady,
        nominateChancellor,
        castVote,
        presidentDiscard,
        chancellorEnact,
        requestVeto,
        vetoResponse,
        investigatePlayer,
        specialElection,
        executePlayer,
        policyPeekAcknowledge,
        playAgain,
        leaveRoom,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
