import { useCallback, useMemo, useState } from 'react';
import type { Role } from 'shared';
import { socket } from '../socket.js';
import { useGame } from '../context/GameContext.js';
import { asset } from '../lib/assets.js';
import { PhaseIndicator } from '../components/game/PhaseIndicator.js';
import { LiberalBoard } from '../components/game/LiberalBoard.js';
import { FascistBoard } from '../components/game/FascistBoard.js';
import { PlayerList } from '../components/game/PlayerList.js';
import { ExecutiveActionToast } from '../components/game/ExecutiveActionToast.js';
import { MyRoleModal } from '../components/game/modals/MyRoleModal.js';
import { NominationModal } from '../components/game/modals/NominationModal.js';
import { VotingModal } from '../components/game/modals/VotingModal.js';
import { PresidentLegislativeModal } from '../components/game/modals/PresidentLegislativeModal.js';
import { ChancellorLegislativeModal } from '../components/game/modals/ChancellorLegislativeModal.js';
import { VetoModal } from '../components/game/modals/VetoModal.js';
import { PolicyPeekModal } from '../components/game/modals/PolicyPeekModal.js';
import { InvestigationModal } from '../components/game/modals/InvestigationModal.js';
import { SpecialElectionModal } from '../components/game/modals/SpecialElectionModal.js';
import { ExecutionModal } from '../components/game/modals/ExecutionModal.js';
import { ElectionResultOverlay } from '../components/game/modals/ElectionResultOverlay.js';
import { PolicyEnactedOverlay } from '../components/game/modals/PolicyEnactedOverlay.js';
import { GameOverOverlay } from '../components/game/modals/GameOverOverlay.js';
import { ChaosOverlay } from '../components/game/modals/ChaosOverlay.js';
import styles from '../styles/GameBoard.module.css';

export function GameBoard() {
  const {
    state,
    dispatch,
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
  } = useGame();
  const [showMyRole, setShowMyRole] = useState(false);

  const { boardState, dossier, gameOverData } = state;
  const myId = socket.id ?? '';

  const clearModal = useCallback(() => {
    dispatch({ type: 'CLEAR_MODAL' });
  }, [dispatch]);

  const clearToast = useCallback(() => {
    dispatch({ type: 'CLEAR_TOAST' });
  }, [dispatch]);

  // Phones often lie face-up on the table, so the board never hints at anyone's role
  // (not even your own). Roles are only shown once the game is over.
  const revealedRoles = useMemo(() => {
    const roles: Record<string, Role> = {};
    for (const p of gameOverData?.players ?? []) roles[p.id] = p.role;
    return roles;
  }, [gameOverData]);

  if (!boardState) {
    return (
      <div className={styles.waiting}>
        <img src={asset('policy-folder-cover-front.png')} alt="" className={styles.waitingImg} />
        <p>Waiting for all players to read their dossier…</p>
      </div>
    );
  }

  const me = boardState.players.find((p) => p.id === myId);
  const isPresident = boardState.presidentId === myId;
  const isChancellor = boardState.chancellorId === myId;
  const amAlive = me?.isAlive ?? false;
  const hasVoted = boardState.votedPlayerIds.includes(myId);

  // Determine eligible chancellor candidates for nomination
  const eligibleCandidates = boardState.players
    .filter((p) => p.isAlive && !p.isPresident && !p.isTermLimited)
    .map((p) => p.id);

  const chancellorCandidate = boardState.players.find(
    (p) => p.id === boardState.chancellorCandidateId
  );
  const president = boardState.players.find((p) => p.id === boardState.presidentId);

  function renderModal() {
    if (!boardState) return null;

    // Game over takes highest priority
    if (gameOverData) {
      return (
        <GameOverOverlay
          data={gameOverData}
          myId={myId}
          isHost={state.isHost}
          onPlayAgain={playAgain}
          onLeave={leaveRoom}
        />
      );
    }

    if (state.chaosNotification) {
      return (
        <ChaosOverlay
          enactedPolicy={state.chaosNotification.enactedPolicy}
          slot={state.chaosNotification.slot}
          onDismiss={clearModal}
        />
      );
    }

    if (state.electionResult) {
      return (
        <ElectionResultOverlay
          result={state.electionResult}
          players={boardState.players}
          myId={myId}
          onDismiss={clearModal}
        />
      );
    }

    if (state.lastEnactedNotification) {
      return (
        <PolicyEnactedOverlay
          policy={state.lastEnactedNotification.policy}
          slot={state.lastEnactedNotification.slot}
          onDismiss={clearModal}
        />
      );
    }

    // Investigation result — shown regardless of current phase because the server
    // advances the round immediately after sending the result, so boardState.phase
    // may already be 'chancellor-nomination' by the time the client re-renders.
    if (state.investigationResult) {
      return (
        <InvestigationModal
          players={boardState.players}
          presidentId={boardState.presidentId}
          investigationResult={state.investigationResult}
          onInvestigate={investigatePlayer}
          onDismiss={clearModal}
        />
      );
    }

    // Phase-based modals (only for relevant players)
    switch (boardState.phase) {
      case 'chancellor-nomination':
        if (isPresident) {
          return (
            <NominationModal
              players={boardState.players}
              eligibleIds={eligibleCandidates}
              onNominate={nominateChancellor}
            />
          );
        }
        return null;

      case 'election':
        if (amAlive && !hasVoted) {
          return (
            <VotingModal
              presidentName={president?.name ?? '???'}
              chancellorName={chancellorCandidate?.name ?? '???'}
              onVote={castVote}
            />
          );
        }
        return null;

      case 'legislative-president':
        if (isPresident && state.presidentPolicies) {
          return (
            <PresidentLegislativeModal
              policies={state.presidentPolicies}
              onDiscard={presidentDiscard}
            />
          );
        }
        return null;

      case 'legislative-chancellor':
        if (isChancellor && state.chancellorPolicies) {
          return (
            <ChancellorLegislativeModal
              policies={state.chancellorPolicies}
              canVeto={state.canVeto}
              onEnact={chancellorEnact}
              onRequestVeto={requestVeto}
            />
          );
        }
        return null;

      case 'veto-requested':
        if (isPresident && state.vetoRequested) {
          return <VetoModal onRespond={vetoResponse} />;
        }
        return null;

      case 'executive-action':
        if (isPresident) {
          switch (boardState.executiveAction) {
            case 'policy-peek':
              if (state.policyPeekPolicies) {
                return (
                  <PolicyPeekModal
                    policies={state.policyPeekPolicies}
                    onAcknowledge={policyPeekAcknowledge}
                  />
                );
              }
              return null;

            case 'investigate-loyalty':
              return (
                <InvestigationModal
                  players={boardState.players}
                  presidentId={boardState.presidentId}
                  investigationResult={state.investigationResult}
                  onInvestigate={investigatePlayer}
                  onDismiss={clearModal}
                />
              );

            case 'special-election':
              return (
                <SpecialElectionModal
                  players={boardState.players}
                  presidentId={boardState.presidentId}
                  onSelect={specialElection}
                />
              );

            case 'execution':
              return (
                <ExecutionModal
                  players={boardState.players}
                  presidentId={boardState.presidentId}
                  onExecute={executePlayer}
                />
              );
          }
        }
        return null;

      default:
        return null;
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.identity}
          onClick={() => setShowMyRole(true)}
          disabled={!dossier}
          aria-label="Show my secret role"
        >
          <span className={styles.identityAvatar}>
            {me?.name.charAt(0).toUpperCase()}
          </span>
          <span className={styles.identityText}>
            <span className={styles.identityName}>
              {me?.name ?? 'You'} <span className={styles.youTag}>You</span>
            </span>
            <span className={styles.identityHint}>Tap to check my role</span>
          </span>
        </button>
        {state.roomCode && (
          <div className={styles.roomCode} aria-label={`Room code ${state.roomCode}`}>
            <span>Room</span>
            {state.roomCode}
          </div>
        )}
      </header>

      <main className={styles.layout}>
        <div className={styles.phase}>
          <PhaseIndicator boardState={boardState} myId={myId} />
          {!amAlive && me && (
            <div className={styles.deadNotice}>
              You have been executed. You can no longer speak, vote or hold office.
            </div>
          )}
        </div>

        <section className={styles.boards} aria-label="Policy boards">
          <LiberalBoard
            liberalPolicies={boardState.liberalPolicies}
            electionTracker={boardState.electionTracker}
          />
          <FascistBoard
            fascistPolicies={boardState.fascistPolicies}
            playerCount={boardState.playerCount}
          />
          <div className={styles.stats}>
            <div className={styles.stat}>
              <img src={asset('board-draw.png')} alt="" className={styles.statImg} />
              <span><b>{boardState.drawPileCount}</b> in deck</span>
            </div>
            <div className={styles.stat}>
              <img src={asset('board-policy.png')} alt="" className={styles.statImg} />
              <span><b>{boardState.discardPileCount}</b> discarded</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.trackerDots} aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < boardState.electionTracker ? styles.dotOn : styles.dot} />
                ))}
              </span>
              <span><b>{boardState.electionTracker}</b>/3 failed</span>
            </div>
            {boardState.vetoUnlocked && <div className={styles.vetoChip}>Veto unlocked</div>}
          </div>
        </section>

        <section className={styles.players} aria-label="Players">
          <h2 className={styles.sectionTitle}>
            Players <span>{boardState.players.filter((p) => p.isAlive).length} alive</span>
          </h2>
          <PlayerList boardState={boardState} myId={myId} knownRoles={revealedRoles} />
        </section>
      </main>

      {renderModal()}

      {/* The acting President already sees the power's modal; everyone else gets a toast. */}
      {state.executiveActionNotification && !gameOverData &&
        !(isPresident && !state.executiveActionNotification.targetName) && (
        <ExecutiveActionToast notification={state.executiveActionNotification} onDismiss={clearToast} />
      )}

      {showMyRole && dossier && <MyRoleModal dossier={dossier} onClose={() => setShowMyRole(false)} />}
    </div>
  );
}
