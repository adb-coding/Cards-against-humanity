# Cards Against Humanity — Multiplayer Web App

A real-time multiplayer web app to play **Cards Against Humanity** in your browser. Players create or join rooms via a shareable code, take turns as the Card Czar, and compete for the most points by playing the funniest white cards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express + Socket.io |
| State | In-memory (no database) |
| Monorepo | npm workspaces |

---

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x

---

## Project Structure

```
Cards-against-humanity/
├── package.json              # Root — workspaces + concurrently dev script
├── README.md
├── .gitignore
├── server/                   # Node.js + Express + Socket.io backend
│   ├── package.json
│   └── src/
│       ├── index.js          # Server entry point
│       ├── socketHandler.js  # All socket event listeners
│       └── game/
│           ├── RoomManager.js
│           ├── Room.js
│           ├── GameEngine.js
│           ├── CardDeck.js
│           └── data/cards.js
└── client/                   # React + Vite frontend
    ├── package.json
    ├── vite.config.js        # base /cah/, dev proxy: /cah/socket.io → localhost:3001
    ├── index.html
    └── src/
        ├── App.jsx           # Root component + socket lifecycle
        ├── socket.js         # Socket.io-client singleton
        └── components/
            ├── lobby/        # Create/join room + waiting room
            └── game/         # Game screen, cards, scoreboard
```

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd Cards-against-humanity
```

### 2. Install all dependencies

From the root directory, a single install command covers both workspaces:

```bash
npm install
```

---

## Running the App

### Development (recommended) — runs server and client simultaneously

```bash
npm run dev
```

This uses `concurrently` to start both:
- **Server** on [http://localhost:3001](http://localhost:3001)
- **Client** on [http://localhost:5174/cah/](http://localhost:5174/cah/)

Open [http://localhost:5174/cah/](http://localhost:5174/cah/) in your browser. To run it together with the game menu and Secret Hitler, use `npm run dev` from the repository root (see ../README.md).

### Run server only

```bash
npm run dev --workspace=server
```

### Run client only

```bash
npm run dev --workspace=client
```

### Production build

```bash
npm run build     # builds client dist/
npm run start     # starts the server
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `VITE_SERVER_URL` | *(empty — uses Vite proxy)* | Override server URL for production |

For production deployment, create a `client/.env` file:

```
VITE_SERVER_URL=https://your-server-domain.com
```

---

## How to Play

1. **Create a Room** — One player opens the app, enters their name, and clicks *Create Room*. A 6-character room code is generated.
2. **Share the Code** — Share the room code with friends. They enter their name and the code to join.
3. **Start the Game** — The host clicks *Start Game* once at least 2 players are in the room.
4. **Each Round:**
   - A **Card Czar** is chosen (rotates every round)
   - A black card is dealt and shown to everyone
   - All non-Czar players pick white card(s) from their hand (7 cards each)
   - Submissions are anonymous — the Czar sees the answers but not who wrote them
   - The Czar picks the funniest answer — that player gets **1 point**
5. **Win Condition** — First player to reach **8 points** wins the game.

---

## Implementation Steps

The following steps describe the implementation roadmap for contributors:

1. **Bootstrap monorepo** — Root `package.json` with npm workspaces and `concurrently` dev script
2. **Scaffold server** — Express app + Socket.io server (`server/src/index.js`)
3. **Implement `CardDeck`** — Shuffle and draw utility for black/white card decks
4. **Implement `Room` + `RoomManager`** — In-memory room state container and 6-char code generation
5. **Implement `GameEngine`** — Pure game logic and phase state machine (lobby → playing → judging → scoring → ended)
6. **Wire socket events** — `socketHandler.js` maps all client events to `GameEngine` calls with phase guards
7. **Scaffold client** — Vite + React with Socket.io-client singleton and Vite proxy config
8. **Build Lobby screens** — Create room, join room, waiting room with live player list
9. **Build Game screens** — Black card display, white card hand selection, anonymous submission reveal, Czar judging view, scoreboard, round result overlay
10. **Style the UI** — Black/white card aesthetic, responsive layout
11. *(Future)* **Full card dataset** — Replace `server/src/data/cards.js` with the complete Cards Against Humanity card set

---

## Adding More Cards

Card packs are discovered automatically at server start: every file in
`server/src/data/languages/<lang>/<pack>.js` that exports `blackCards` and `whiteCards`
appears as a selectable pack in the waiting-room settings (the host can pick several at once).
Optionally export `name` to set the pack's display name. A new language folder shows up as a new language.

```js
export const name = 'Holiday pack';
export const blackCards = [{ id: 'hol_b_001', text: 'This year Santa brought me ___.', pick: 1 }];
export const whiteCards = [{ id: 'hol_w_001', text: 'A suspiciously heavy stocking.' }];
```

Use ids that are unique across packs.

## Planned Features

- [ ] Full card dataset from the official Cards Against Humanity card set
- [ ] *What Do You Meme* game mode
- [ ] Custom card creation
- [ ] Timer for submissions
- [ ] Spectator mode
- [ ] Persistent room rejoin on reconnect

---

## License

MIT
