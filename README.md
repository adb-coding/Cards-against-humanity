# Table Night

A game-night hub: players pick a name on the menu page, choose a game, and jump in.

| Path    | What                                   | Source                          |
|---------|----------------------------------------|---------------------------------|
| `/`     | Menu: enter your name, pick a game     | `launcher/`                     |
| `/cah/` | Cards Against Humanity                 | `Cards-against-humanity/client` |
| `/sh/`  | Secret Hitler                          | `SH/client`                     |

## Architecture

```
table-night/
├── package.json            # npm workspaces for everything below
├── netlify.toml            # one Netlify site: menu + both games
├── scripts/assemble.mjs    # merges the 3 Vite builds into dist/
├── launcher/               # static menu page (Vite, vanilla JS)
├── server/                 # gateway: one Node process hosting both game backends
├── Cards-against-humanity/ # client (React) + server (Socket.IO)
└── SH/                     # shared types + client (React/TS) + server (Socket.IO/TS)
```

Both games follow the same conventions:

- **Base path** — each client is built with its own Vite `base` (`/cah/`, `/sh/`) so they live side by side on one site.
- **Socket.IO path** — each backend listens on its own path (`/cah/socket.io`, `/sh/socket.io`). The gateway in `server/` mounts both on one HTTP server, so production needs a single backend service. Each game's own server still runs standalone with the same path.
- **Server URL** — clients read `VITE_SERVER_URL`; when it's empty (dev), the Vite proxy forwards the socket path to `localhost:3001`.
- **Player name** — the menu passes the name as `?name=…` and stores it in `localStorage` (`tableNight.playerName`). Each game reads it in `src/tableNight.(js|ts)` and pre-fills its create/join forms. The games link back to the menu with "← All games".

## Development

```bash
npm install     # once, from this folder
npm run dev     # gateway :3001, menu :5173, CAH :5174/cah/, SH :5175/sh/
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

To add another game: give its client a unique Vite `base` and Socket.IO `path`, mount its handlers in `server/src/index.ts`, add its build to `scripts/assemble.mjs` and `netlify.toml`, and add a card to `launcher/index.html`.
