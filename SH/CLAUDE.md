# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Large Codebase Analysis

When analyzing large portions of this codebase or dealing with inputs that require extensive token usage, use Gemini CLI in headless mode to retrieve context efficiently:

```bash
gemini -p "your prompt here" < file_or_input
# or for multiple files:
cat server/src/game/GameEngine.ts shared/src/types.ts | gemini -p "analyze this"
```

## Project Overview

A full-stack digital implementation of the Secret Hitler board game. React + TypeScript frontend communicates with a Node.js/Express backend via Socket.IO WebSockets.

## Commands

```bash
# Install dependencies (run from root)
npm install

# Start both server (port 3001) and client (http://localhost:5175/sh/) in parallel.
# To run with the game menu and Cards Against Humanity, use `npm run dev` from the repo root (../README.md).
npm run dev

# Start only the backend
npm run dev:server

# Start only the frontend
npm run dev:client

# Production build (client only)
npm run build
```

No test or lint scripts are configured.

## Architecture

### Monorepo Structure

npm workspaces with three packages:
- `shared/` — TypeScript interfaces, Socket.IO event types, game constants (shared between client and server)
- `server/` — Express + Socket.IO backend
- `client/` — React + Vite frontend

### Server (`server/src/`)

- `index.ts` — Express + Socket.IO server setup on port 3001, Socket.IO on path `/sh/socket.io`, CORS from `CORS_ORIGIN` (default `*`). In production the root gateway (`../server`) mounts `socket/handler.ts` instead
- `socket/handler.ts` — Registers all socket event handlers
- `socket/lobbyHandler.ts` — Room creation, joining, player management
- `socket/gameHandler.ts` — All game-phase actions (voting, legislation, executive actions)
- `game/GameEngine.ts` — Core game state machine; enforces all Secret Hitler rules (557 lines)
- `game/GameRoom.ts` — Per-room player tracking and lobby state
- `game/RoomManager.ts` — Registry of active `GameRoom` instances
- `game/RoleAssigner.ts` — Shuffles and assigns roles to players

### Client (`client/src/`)

- `socket.ts` — Singleton Socket.IO client instance
- `context/GameContext.tsx` — All client state via `React.useReducer`; socket listeners dispatch actions; player actions emit socket events
- `App.tsx` — Top-level screen router: `menu → lobby → dossier-reveal → game-board`
- `screens/` — Full-page views (`MainMenu`, `Lobby`, `DossierReveal`, `GameBoard`)
- `components/game/modals/` — 13 modal overlays, one per game phase (nomination, voting, legislation, executive actions, results, chaos, game-over)

### Shared (`shared/src/`)

- `types.ts` — All domain types: `Role`, `Team`, `GamePhase`, player and game state interfaces
- `events.ts` — Typed `ClientToServerEvents` and `ServerToClientEvents` interfaces for Socket.IO
- `constants.ts` — Game balance: role distribution per player count, policy deck composition, executive action tables

### State Flow

1. Server is the single source of truth. After every validated action, it emits `game:state-update` with the full `GameState`.
2. Client stores the latest `GameState` in `GameContext` as `boardState`.
3. Modal visibility is driven by `boardState.currentPhase` and player identity checks.
4. All player actions are validated server-side before any state change is broadcast.

### Game Phases

`chancellor-nomination → election → legislative-president → legislative-chancellor → executive-action → (repeat)`

Chaos (3 consecutive failed elections) auto-enacts a policy and resets the tracker. Veto mechanic unlocks after 5 fascist policies.

### Network Protocol

~25 client→server events (lobby lifecycle + one per game action) and ~22 server→client events (state updates + phase-specific data like drawn policies, investigation results). All events are fully typed via `shared/src/events.ts`.
