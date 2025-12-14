# Project History & Status

**Last Updated:** December 14, 2024
**Project:** Ajedrez P2P + Lichess Integration
**Repo:** [https://github.com/Taladro678/ajedrez-p2p](https://github.com/Taladro678/ajedrez-p2p)
**Deployed URL:** [https://ajedrez-p2p.vercel.app](https://ajedrez-p2p.vercel.app)

## Context for AI Assistants
If you are an AI assistant resuming work on this project, please read this file to understand the current state.

### 1. Core Features
*   **P2P Chess**: PeerJS based peer-to-peer connection.
*   **Stockfish**: Local AI opponent.
*   **Lichess Integration**:
    *   **Architecture**: Uses a `LichessConnection` adapter to mimic PeerJS connections.
    *   **Authentication**: Switched from "OAuth Code Flow" to **Manual Personal Access Token** flow.
    *   **Reason**: Lichess restricted public OAuth App registration. Users must generate a token with `board:play` scope at `https://lichess.org/account/oauth/token/create` and paste it into the app.
    *   **Storage**: Token is stored in `localStorage` ('lichess_token').

### 2. Recent Changes
*   Fixed `auth/unauthorized-domain` in Firebase for Vercel.
*   Implemented PWA (manifest, icons).
*   Optimized CSS for mobile (`100dvh`).
*   **Critical**: Modified `src/components/Lobby.jsx` to show a manual token input field instead of the "Login with Lichess" button when no token is present.
*   **Critical**: Updated `src/services/lichess.js` to support this flow (though `login()` is largely deprecated/unused in the UI).

### 3. Usage Instructions
*   **New Session**: To resume debugging or dev, check `git status`. The `main` branch is the source of truth.
*   **Deployment**: Updates are pushed to GitHub and automatically deployed by Vercel.

## Task Status
- [x] Integrate Lichess API (Matchmaking & Game Stream)
- [x] Mobile Optimization (CSS)
- [x] PWA Configuration
- [x] Deployment to Vercel
- [x] Fix Auth Domain Issues
- [x] Implement Manual Token Fallback for Lichess

## Known Issues / Notes
*   **Lichess OAuth**: The standard OAuth App flow is disabled in favor of Personal Tokens due to registration restrictions. Do not try to revert to "Client ID" based flow unless Lichess policy changes.
*   **Files**:
    *   `src/components/Lobby.jsx`: Main UI logic for connection.
    *   `src/services/lichess.js`: API wrapper.
