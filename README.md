# Table Night

A game-night hub: players pick a name on the menu page, choose a game, and jump in.

| Path    | What                                   | Source                          |
|---------|----------------------------------------|---------------------------------|
| `/`     | Menu: enter your name, pick a game     | `launcher/`                     |
| `/cah/` | Cards Against Humanity                 | `Cards-against-humanity/client` |
| `/sh/`  | Secret Hitler                          | `SH/client`                     |
| `/lupus/` | Lupus in Tabula                      | `Lupus/client`                  |

## Architecture

```
table-night/
├── package.json            # npm workspaces for everything below
├── netlify.toml            # one Netlify site: menu + both games
├── scripts/assemble.mjs    # merges the 3 Vite builds into dist/
├── launcher/               # static menu page (Vite, vanilla JS)
├── server/                 # gateway: one Node process hosting both game backends
├── Cards-against-humanity/ # client (React) + server (Socket.IO)
├── SH/                     # shared types + client (React/TS) + server (Socket.IO/TS)
└── Lupus/                  # Lupus in Tabula: shared types + client (React/TS) + server (Socket.IO/TS)
```

Both games follow the same conventions:

- **Base path** — each client is built with its own Vite `base` (`/cah/`, `/sh/`) so they live side by side on one site.
- **Socket.IO path** — each backend listens on its own path (`/cah/socket.io`, `/sh/socket.io`). The gateway in `server/` mounts both on one HTTP server, so production needs a single backend service. Each game's own server still runs standalone with the same path.
- **Server URL** — clients read `VITE_SERVER_URL`; when it's empty (dev), the Vite proxy forwards the socket path to `localhost:3001`.
- **Player name** — the menu passes the name as `?name=…` and stores it in `localStorage` (`tableNight.playerName`). Each game reads it in `src/tableNight.(js|ts)` and pre-fills its create/join forms. The games link back to the menu with "← All games".

## Development

```bash
npm install     # once, from this folder
npm run dev     # gateway :3001, menu :5173, CAH :5174/cah/, SH :5175/sh/, Lupus :5176/lupus/
npm test        # Lupus in Tabula game-logic tests
```

Open http://localhost:5173.

## Deploying

Netlify only serves static files, and the games need a long-lived WebSocket server, so the deploy has two parts.

1. **Backend (`server/`)** on any Node host (Render, Railway, Fly.io…):
   - Root directory: repository root
   - Build: `npm install`
   - Start: `npm start`
   - Env: `PORT` (usually set by the host), `CORS_ORIGIN=https://<your-site>.netlify.app`
   - Health check: `GET /health`
2. **Frontend** on Netlify, from the repository root (`netlify.toml` sets the build command and `dist/` as the publish folder):
   - Env: `VITE_SERVER_URL=https://<your-backend-host>` (without any path)

## Lupus in Tabula

`Lupus/` holds the game (`shared/` types and role texts, `server/` rules engine, `client/` React app). The client uses the cropped, web-sized art in `Lupus/client/public/assets`; the full-size card originals and the rulebook PDF stay in `Lupus/assets` on the author's machine and are git-ignored.

- **Seats survive refreshes.** A seat belongs to a secret token kept in the browser, not to the socket: reloading the page, locking the phone or losing the connection brings the player straight back (`room:resume`). A player who lost their browser data can rejoin with the same name while their seat is offline.
- **Secrets stay on the server.** Every player receives their own view of the game (`Room.viewFor`); other players' roles are never sent, and only a human narrator gets the full picture.
- **Two narrator modes.** Automatic: the app calls each role during the night and waits for it to act on its own phone (roles that are dead are still called, for a random time). Human: the host has no card, sees every role and calls the roles by hand.
- `npm test` runs the rules tests (`Lupus/server/test`). To try a game alone, create a room and fill it with bots: `npm run bots -w lupus-server -- ABCD 6`.
- **Narrator's voice.** Optionally the host's phone (or everyone's) plays the narrator's recorded lines during the night (`Lupus/client/public/assets/audio`, generated with ElevenLabs: nightfall, one call per role, "occhi chiusi", daybreak, plus a bell and a rooster) and vibrates, so the table can really keep its eyes closed. Who died is never spoken, only shown.

To add another game: give its client a unique Vite `base` and Socket.IO `path`, mount its handlers in `server/src/index.ts`, add its build to `scripts/assemble.mjs` and `netlify.toml`, and add a card to `launcher/index.html`.
