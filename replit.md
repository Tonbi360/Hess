# Hess

A custom chess variant browser game playable by two players on the same screen (pass & play).

## Run & Operate

- `pnpm --filter @workspace/hess run dev` — run the game frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/hess)
- Styling: Tailwind CSS v4, framer-motion
- Game logic: pure TypeScript (no backend needed for gameplay)
- API: Express 5 (artifacts/api-server) — currently only health check

## Where things live

- `artifacts/hess/src/lib/types.ts` — all game types (Piece, Board, GameState, etc.)
- `artifacts/hess/src/lib/engine.ts` — complete game engine (move generation, win conditions)
- `artifacts/hess/src/lib/useGameState.ts` — React hook wiring engine to UI
- `artifacts/hess/src/pages/GamePage.tsx` — main page
- `artifacts/hess/src/components/` — board, piece icons, overlays, info panel, rulebook

## Hess Rules (summary)

- **Board**: 8x8, Black territory = squares 0–31 (rows 0–3), White territory = squares 32–63 (rows 4–7)
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

- Game state is entirely in React (useState) — no server persistence needed for pass & play
- Engine uses 1D array (length 64) for the board; row = Math.floor(sq/8), col = sq%8
- Win condition 1 (King capture) is detected on every move application
- Win condition 2 (Desperation Stale) is checked at the start of each turn
- Jester bounce triggers a JESTER_SACRIFICE phase before returning control to the attacker's turn
- Knight T-shape removes the 2-backward-step moves (6 landing squares vs standard 8)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after changing openapi.yaml: `pnpm --filter @workspace/api-spec run codegen`
- Bishop staircase alternates vertical then horizontal steps (each intermediate step is also a blockable landing point)
- Rook offsets (±4, ±6) are raw 1D array offsets — they can cross row boundaries intentionally
