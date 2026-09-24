import type {
  LobbyPlayer,
  DossierRevealPayload,
  GameBoardState,
  PresidentLegislativePayload,
  ChancellorLegislativePayload,
  ElectionResult,
  PolicyPeekPayload,
  InvestigationPayload,
  GameOverPayload,
  Vote,
  VetoResponse,
  PolicyType,
  ExecutiveAction,
} from './types.js';

export interface ClientToServerEvents {
  'lobby:create': (data: { playerName: string }) => void;
  'lobby:join': (data: { playerName: string; roomCode: string }) => void;
  'lobby:start-game': () => void;
  'game:dossier-ready': () => void;
  'game:nominate-chancellor': (data: { targetId: string }) => void;
  'game:cast-vote': (data: { vote: Vote }) => void;
  'game:president-discard': (data: { discardIndex: number }) => void;
  'game:chancellor-enact': (data: { enactIndex: number }) => void;
  'game:request-veto': () => void;
  'game:veto-response': (data: { response: VetoResponse }) => void;
  'game:investigate-player': (data: { targetId: string }) => void;
  'game:special-election': (data: { targetId: string }) => void;
  'game:execute-player': (data: { targetId: string }) => void;
  'game:policy-peek-acknowledge': () => void;
  'game:play-again': () => void;
}

export interface ServerToClientEvents {
  'lobby:created': (data: { roomCode: string; players: LobbyPlayer[] }) => void;
  'lobby:joined': (data: { roomCode: string; players: LobbyPlayer[] }) => void;
  'lobby:player-joined': (data: { players: LobbyPlayer[] }) => void;
  'lobby:player-left': (data: { players: LobbyPlayer[] }) => void;
  'lobby:error': (data: { message: string }) => void;
  'game:started': () => void;
  'game:dossier-reveal': (data: DossierRevealPayload) => void;
  'game:state-update': (data: GameBoardState) => void;
  'game:president-draw': (data: PresidentLegislativePayload) => void;
  'game:chancellor-receive': (data: ChancellorLegislativePayload) => void;
  'game:election-result': (data: ElectionResult) => void;
  'game:policy-enacted': (data: { policy: PolicyType; slot: number }) => void;
  'game:policy-peek': (data: PolicyPeekPayload) => void;
  'game:investigation-result': (data: InvestigationPayload) => void;
  'game:executive-action-notification': (data: { action: ExecutiveAction; presidentName: string; targetName?: string }) => void;
  'game:over': (data: GameOverPayload) => void;
  'game:chaos': (data: { enactedPolicy: PolicyType; slot: number }) => void;
  'game:veto-request': () => void;
}
