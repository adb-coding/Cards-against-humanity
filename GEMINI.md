# GEMINI.md - Cards Against Humanity Project Context

This file provides architectural context and development guidelines for the Cards Against Humanity web application.

## Project Overview
A real-time, multiplayer "Cards Against Humanity" clone built with a modern JavaScript stack. The project is organized as a monorepo using **npm workspaces**.

- **Frontend:** React 18, Vite, Socket.io-client.
- **Backend:** Node.js, Express, Socket.io.
- **State Management:** 
  - **Server-side:** In-memory state managed by `RoomManager` and `GameEngine`. No persistent database is used.
  - **Client-side:** Centralized game state in `App.jsx`, updated via socket events.
- **Communication:** Bi-directional real-time events via Socket.io.

## Directory Structure
- `client/`: React frontend.
  - `src/App.jsx`: Main entry point, socket event listeners, and screen routing.
  - `src/socket.js`: Socket.io client configuration.
  - `src/components/`: Sub-divided into `lobby/` (pre-game) and `game/` (active gameplay).
- `server/`: Node.js backend.
  - `src/index.js`: Server entry point and HTTP/Socket.io setup.
  - `src/socketHandler.js`: Bridges socket events to game logic.
  - `src/game/`: Core logic (GameEngine, Room, RoomManager, CardDeck).
  - `src/data/cards.js`: The card dataset.

## Building and Running

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### Key Commands
- `npm install`: Install dependencies for both root and workspaces.
- `npm run dev`: Runs both client (5173) and server (3001) in development mode using `concurrently`.
- `npm run build`: Builds the client for production.
- `npm run start`: Starts the production server.

## Development Conventions

### Socket Event Naming
- **`room:*`**: Events related to room lifecycle (create, join, leave, error).
- **`game:*`**: Events related to gameplay (start, deal, submit, judge, next round).

### Game Logic & State Machine
The game follows a strict phase-based state machine managed by `GameEngine.js`:
1.  **`lobby`**: Players joining the room.
2.  **`playing`**: Non-czar players selecting white cards.
3.  **`judging`**: Card Czar selecting the winner from anonymous submissions.
4.  **`scoring`**: Winner revealed, points updated, waiting for next round.
5.  **`ended`**: Final winner declared.

### Architecture Guidelines
- **Logic Separation:** Keep game rules and state transitions in `server/src/game/GameEngine.js`. Avoid putting game logic directly in `socketHandler.js`.
- **Anonymity:** Ensure submissions are shuffled in `GameEngine.buildJudgingState` before being sent to the client to maintain the game's anonymous nature.
- **Room Management:** Use `RoomManager` for all room lookups and lifecycle events.
- **Styling:** The project uses Vanilla CSS-in-JS or standard CSS; maintain the black-and-white minimalist aesthetic.

## Troubleshooting & Tips
- **Vite Proxy:** The client is configured to proxy `/socket.io` to `localhost:3001` in development.
- **Adding Cards:** Simply update `server/src/data/cards.js`. The `CardDeck` class handles shuffling and exhaustion automatically.
- **Room Codes:** 6-character uppercase alphanumeric codes (omitting ambiguous characters like '0', '1', 'I', 'O').
