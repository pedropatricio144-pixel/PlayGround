# BLUEFRONT // Echoes

A Portuguese-language 3D co-op boss-arena prototype built with Three.js, Node.js, and WebSockets.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/pedropatricio144-pixel/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/pedropatricio144-pixel/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/pedropatricio144-pixel/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/pedropatricio144-pixel/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/pedropatricio144-pixel/PlayGround).
- 🛠️ [Check build runs](https://github.com/pedropatricio144-pixel/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/pedropatricio144-pixel/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/pedropatricio144-pixel).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->

## Run locally

Requirements: Node.js 18+ and npm. The Three.js library and fonts are loaded from CDNs, so the browser needs internet access.

```sh
npm install
npm start
```

Open <http://localhost:3000> in one or more browser tabs. Set `PORT` to use a different port, for example `PORT=3001 npm start`. Each WebSocket-connected browser is a player; use separate tabs or devices to try co-op. The server currently keeps game state in memory and resets it when restarted.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move around the arena |
| Mouse | Aim; hold the left mouse button to fire |
| Q | Arc Blast area ability (cooldown applies) |
| R or Space | Phase Dash |
| E | Start a revive on a nearby downed teammate; press E three more times to complete it |
| B | Open the arsenal |
| Escape | Close the arsenal |

Click **Iniciar Operação** to begin. The HUD, prompts, and shop are in Portuguese.

## Game loop

- Start with three lives, 100 HP, and a Field Rifle. Fight the Hollow Warden and arena enemies, collect Blue Coins, and spend coins on military or mystical weapons.
- Losing all three lives changes the player into a visible-to-teammates specter and disables combat. A living teammate must approach, press **E** to grab, then complete three more **E** interactions. The revived player returns with one life and 60 HP; owned weapons and inventory are retained.
- Defeating the boss advances the shared phase, awards living players coins, and starts the next boss cycle. Boss HP and phase are shared by connected players.

## Architecture and multiplayer

- `index.html` holds the HUD and overlays; `style.css` styles them.
- `game.js` creates the Three.js arena, player visuals, input, combat feedback, HUD, and WebSocket client. The enemies and pickups are currently simulated locally in each browser.
- `server.js` serves the static game and maintains in-memory player records and shared boss progression. WebSocket snapshots are broadcast every 100 ms. Player movement, purchases, boss hits, rewards, damage, and revive actions are sent as messages; clients use snapshots to update remote players and shared state.
- `package.json` defines the `npm start` command and the `ws` dependency.

The server checks weapon ownership and boss-hit/skill cooldowns, purchase prices and balances, movement bounds, revive range/progress, and a capped reward rate. This is a playable prototype, not a hardened competitive-game backend: some events (notably incoming damage and reward claims) originate from clients, and enemies/pickups are not server-authoritative. Do not treat client messages as trusted in a public deployment. A production version should simulate combat and validate rewards on the server, add connection/input limits, and persist accounts/state.

## Quick checks

```sh
node --check server.js
node --check game.js
```
