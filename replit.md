# Hess

A custom chess variant browser game playable by two players on the same screen (pass & play) **or against an AI opponent named "Hess"**.

## Run & Operate

- `pnpm --filter @workspace/hess run dev` — run the game frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite libs (hess-engine, hess-ai) only
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/hess)
- Styling: Tailwind CSS v4, framer-motion
- Game logic: pure TypeScript in `lib/hess-engine` (no backend needed for core gameplay)
- AI engine: pure TypeScript in `lib/hess-ai` (negamax + TD-learning)
- API: Express 5 + Socket.io (artifacts/api-server, port 8080)

## Where things live

```
lib/hess-engine/src/
  engine.ts       — move generation, applyMove, applyKingSwap, win conditions, move history
  types.ts        — all game types (Piece, Board, GameState, etc.)
  index.ts        — re-exports

lib/hess-ai/src/
  encoder.ts      — 22-feature state encoder + outcomeForColor
  evaluator.ts    — linear evaluator (weights vector + SGD update)
  search.ts       — negamax alpha-beta, getBestMove, applyAnyMove
  selfPlay.ts     — runSelfPlay (async, game-by-game with setImmediate yield)
  training.ts     — trainOnBuffer, trainOnGame (TD-style SGD)
  replayBuffer.ts — circular buffer (max 50k entries), JSON persistence
  weightsStore.ts — saveWeights / loadWeights (JSON file)
  index.ts        — barrel re-exports

artifacts/api-server/src/
  game/aiManager.ts     — singleton: evaluator + replay buffer, computeMove, recordAndTrain, runSelfPlay, resetWeights
  game/rooms.ts         — Room state, createRoom, createAiRoom, AI move application, rematch system
  game/socketHandler.ts — all Socket.io events (game, AI game, self-play admin, rematch, disconnect)
  data/                 — auto-created: weights.json, replayBuffer.json (gitignored)

artifacts/hess/src/
  pages/
    LobbyPage.tsx       — 3-mode lobby (vs Player / vs AI / Hess vs Hess admin)
    GamePage.tsx        — full-viewport board, top bar, hamburger menu, player bars
  components/
    HessBoard.tsx       — 8×8 board renderer
    HamburgerMenu.tsx   — sliding drawer (piece rules, move history, captures, king swap, leave)
    WinScreen.tsx       — game over overlay with Rematch + Leave
    SelfPlayPanel.tsx   — self-play admin UI (password, config, live progress bar)
    JesterSacrificeOverlay.tsx
    RulebookDrawer.tsx
    PieceIcon.tsx
  lib/
    useOnlineGame.ts    — main game hook (all socket logic, AI mode, rematch)
    engine.ts           — client-side engine re-exports
    types.ts            — shared type imports
```

## Lobby Modes

| Mode | Description |
|---|---|
| **vs Player** | Create room (get 6-char code) or join by code. Pass & play or share code with a friend. |
| **vs AI (Hess)** | Select difficulty (Easy/Normal/Hard), play immediately as White vs the Hess AI (Black). Post-game TD-learning runs asynchronously. |
| **Hess vs Hess** | Admin-only self-play panel. Enter `AI_ADMIN_PASSWORD`, configure game count (10–500) and search depth (1–4), watch live progress, reset weights. |

## AI System

- **Search**: Negamax with alpha-beta pruning. Captures sorted first for better pruning.
- **Evaluation**: 22-feature linear model (piece counts, king position, pawn advancement, swap counts).
- **Difficulty**:
  - Easy: depth 1, ε=0.20
  - Normal: depth 2, ε=0.05
  - Hard: depth 3, ε=0.02
- **Learning**: After each vs-AI game, positions are added to the replay buffer and the evaluator is updated via TD-style SGD. Self-play runs batch training after all games.
- **Persistence**: `artifacts/api-server/data/weights.json` and `replayBuffer.json` (auto-created, max 50k entries).
- **Admin password**: `process.env.AI_ADMIN_PASSWORD` (falls back to `'hess-admin'`). Set the `AI_ADMIN_PASSWORD` secret in Replit Secrets to secure the admin panel.

## Hess Rules (summary)

- **Board**: 8×8, Black territory = squares 0–31 (rows 0–3), White territory = squares 32–63 (rows 4–7)
- **King**: standard moves + 3 swaps with any friendly Pawn (cannot swap into an attacked square)
- **Queen**: standard movement but locked to own half (cannot cross the midfield)
- **Rook**: missile — jumps to S±4 and S±6, ignores blocking pieces
- **Bishop**: staircase zig-zag (alternating vertical + horizontal steps, blockable)
- **Knight**: T-shape — 2 squares any direction + 1 sideways, the 2-step cannot be backward toward own side
- **Pawn**: normal chess movement; promotes to Jester on reaching enemy's last rank
- **Jester**: moves diagonally forward only; cannot be directly captured (attacker bounces back, Jester owner must sacrifice another piece — not the King)
- **Win**: capture the King, or Desperation Stale (King attacked + 0 swaps + no piece can block/capture)
- **Setup phase**: each player arranges their back row before play begins

## Architecture decisions

- Game state is in Socket.io rooms on the server (not persisted to DB — pass & play doesn't need it)
- Engine uses 1D array (length 64) for the board; row = Math.floor(sq/8), col = sq%8
- Win condition 1 (King capture) is detected on every move application
- Win condition 2 (Desperation Stale) is checked at the start of each turn
- Jester bounce triggers a JESTER_SACRIFICE phase before returning control to the attacker's turn
- Knight T-shape removes the 2-backward-step moves (6 landing squares vs standard 8)
- AI always plays BLACK in vs-AI games; setup is auto-confirmed server-side
- AI response delay: 600ms (cosmetic, for feel)
- Self-play uses `setImmediate` between games to avoid blocking the event loop
- `lib/hess-ai` is Node-only (uses `node:fs`); never import it from the frontend
- Move history notation: `"P:e2-e4"` (piece abbr : from : to), `"K-swap:e1↔d2"` for king swaps

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing any `lib/*` package (builds declarations)
- `lib/hess-ai` requires `"types": ["node"]` in its tsconfig — it uses `node:fs` for persistence
- Socket.io handlers: never `return socket.emit(...)` — TypeScript TS7030 (`noImplicitReturns`). Use `socket.emit(...); return;` instead
- Bishop staircase alternates vertical then horizontal steps (each intermediate step is also a blockable landing point)
- Rook offsets (±4, ±6) are raw 1D array offsets — they can cross row boundaries intentionally
- AI data directory (`artifacts/api-server/data/`) is auto-created on first run, no manual setup needed
