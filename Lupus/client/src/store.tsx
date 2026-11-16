import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GameView, NightStepId, Phase, SessionInfo, SettingsPatch } from 'lupus-shared';
import { clearSession, loadSession, saveSession } from './session.js';
import { socket } from './socket.js';
import { savePlayerName } from './tableNight.js';

type Status = 'connecting' | 'home' | 'room';

interface Notice {
  id: number;
  message: string;
}

interface LupusValue {
  status: Status;
  /** False while the socket is reconnecting. */
  online: boolean;
  view: GameView | null;
  /** Server clock minus local clock, in ms. */
  clockOffset: number;
  notice: Notice | null;
  error: string | null;
  busy: boolean;
  create: (name: string) => void;
  join: (name: string, roomCode: string) => void;
  leave: () => void;
  claimHost: () => void;
  kick: (playerId: string) => void;
  updateSettings: (patch: SettingsPatch) => void;
  start: () => void;
  seenCard: () => void;
  advance: (from: Phase) => void;
  abort: () => void;
  nightAct: (step: NightStepId, targetId: string | null) => void;
  nightAck: (step: NightStepId) => void;
  narratorAct: (step: NightStepId, targetId: string | null) => void;
  narratorNext: (step: NightStepId) => void;
  castVote: (targetId: string | null) => void;
  dismissNotice: () => void;
}

const LupusContext = createContext<LupusValue | null>(null);

export function LupusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('connecting');
  const [online, setOnline] = useState(false);
  const [view, setView] = useState<GameView | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const noticeSeq = useRef(0);

  const showNotice = useCallback((message: string) => {
    setNotice({ id: ++noticeSeq.current, message });
  }, []);

  useEffect(() => {
    const toHome = () => {
      setView(null);
      setStatus('home');
    };

    const onConnect = () => {
      setOnline(true);
      // Every (re)connection gets a new socket id: ask for our seat back.
      const saved = loadSession();
      if (!saved) return toHome();
      socket.emit('room:resume', { ...saved.session, fromBackup: saved.fromBackup }, (res) => {
        if (res.ok) return; // the state follows
        // 'in-use': the saved seat is open in another tab, leave it alone.
        clearSession(res.error === 'in-use' ? 'tab' : 'all');
        toHome();
      });
    };
    const onDisconnect = () => setOnline(false);
    const onState = (next: GameView) => {
      setClockOffset(next.now - Date.now());
      setView(next);
      setStatus('room');
    };
    const onNotice = (data: { message: string }) => showNotice(data.message);
    const onEnded = (data: { reason: string; message: string }) => {
      clearSession(data.reason === 'replaced' ? 'tab' : 'all');
      toHome();
      showNotice(data.message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state', onState);
    socket.on('notice', onNotice);
    socket.on('session:ended', onEnded);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state', onState);
      socket.off('notice', onNotice);
      socket.off('session:ended', onEnded);
      socket.disconnect();
    };
  }, [showNotice]);

  // Notices fade out on their own.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice((n) => (n?.id === notice.id ? null : n)), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const value = useMemo<LupusValue>(() => {
    const enter = (res: { ok: true; session: SessionInfo } | { ok: false; error: string }) => {
      setBusy(false);
      if (res.ok) saveSession(res.session);
      else setError(res.error);
    };
    return {
      status,
      online,
      view,
      clockOffset,
      notice,
      error,
      busy,
      create: (name) => {
        setError(null);
        setBusy(true);
        savePlayerName(name);
        socket.emit('room:create', { name }, enter);
      },
      join: (name, roomCode) => {
        setError(null);
        setBusy(true);
        savePlayerName(name);
        socket.emit('room:join', { name, roomCode }, enter);
      },
      leave: () => {
        socket.emit('room:leave');
        // Don't wait for the server: forget the seat right away, even when offline.
        clearSession('all');
        setView(null);
        setStatus('home');
      },
      claimHost: () => socket.emit('host:claim'),
      kick: (playerId) => socket.emit('host:kick', { playerId }),
      updateSettings: (patch) => socket.emit('lobby:settings', patch),
      start: () => socket.emit('lobby:start'),
      seenCard: () => socket.emit('game:seen-card'),
      advance: (from) => socket.emit('game:advance', { from }),
      abort: () => socket.emit('game:abort'),
      nightAct: (step, targetId) => socket.emit('night:act', { step, targetId }),
      nightAck: (step) => socket.emit('night:ack', { step }),
      narratorAct: (step, targetId) => socket.emit('narrator:act', { step, targetId }),
      narratorNext: (step) => socket.emit('narrator:next', { step }),
      castVote: (targetId) => socket.emit('vote:cast', { targetId }),
      dismissNotice: () => setNotice(null),
    };
  }, [status, online, view, clockOffset, notice, error, busy]);

  return <LupusContext.Provider value={value}>{children}</LupusContext.Provider>;
}

export function useLupus(): LupusValue {
  const ctx = useContext(LupusContext);
  if (!ctx) throw new Error('useLupus must be used within LupusProvider');
  return ctx;
}

/** Current server time, refreshed twice a second while `active`. */
export function useServerNow(active: boolean): number {
  const { clockOffset } = useLupus();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [active]);
  return now + clockOffset;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
