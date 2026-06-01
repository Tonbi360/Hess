# Hess — Project Overview

> A custom chess variant built as a browser-based two-player online game.

---

## What Is Hess?

Hess is an original chess variant designed for two players. It keeps the familiar 8×8 board and general feel of chess, but every single piece moves differently, the board has a territorial midfield line, and there are brand new mechanics like the King Swap, the Jester's bounce defense, and Desperation Stale.

The game is fully playable online — one player creates a room and shares a 6-character code, the other joins, and they play in real time from separate devices.

---

## How to Play

### Starting a Game

1. Open the game in your browser.
2. Enter your name.
3. **Create Game** — you receive a room code (e.g. `K7MQ2P`). Share it with your opponent.
4. Your opponent enters your code under **Join Game**.
5. Once both players are connected, the game begins automatically.

### Setup Phase

Before the first move, each player secretly rearranges their back row:

- **White** goes first — tap two pieces to swap them, then tap **Ready**.
- **Black** does the same on their side.
- Once both are ready, the game begins with White moving first.

This lets you customize your starting formation before your opponent sees it.

---

## The Board

- Standard 8×8 grid.
- **White territory**: rows 5–8 (bottom half), squares 32–63 in the engine's 1D array.
- **Black territory**: rows 1–4 (top half), squares 0–31.
- A visible **midfield line** runs between rows 4 and 5.
- The board is displayed from White's perspective (White at the bottom).

---

## Piece Rules

### King
- Moves 1 square in any direction, like a standard chess King.
- **King Swap** (3 uses per game): instantly swap positions with any friendly Pawn. Cannot swap into a square that is currently attacked by the enemy.

### Queen — The Territorial Empress
- Moves like a standard chess Queen: any number of squares in any direction, sliding through empty squares.
- **Hard restriction**: she cannot cross the midfield line. She is purely a defensive piece — powerful in her own half, useless in enemy territory.

### Rook — The Missile
- Does **not** slide like a standard Rook.
- Instantly jumps to squares that are exactly **4 or 6 index positions** away (S±4 or S±6 in the 1D board array).
- **Ignores all pieces** between its current position and the target. Only what's on the landing square matters.
- This makes it a long-range sniper that fires in fixed bursts rather than sliding freely.

### Bishop — The Staircase
- Moves in a zig-zag staircase: one step vertically, then one step horizontally, repeating.
- Each intermediate step along the staircase is a valid landing square.
- **Blockable** — any piece in the path stops the staircase at that point (enemy pieces can be captured there; friendly pieces just block).
- 4 diagonal directions, each producing a staircase path.

### Knight — T-Shape
- Moves 2 squares in any direction, then 1 square sideways (perpendicular).
- Standard chess Knights can also step 1 square then 2 sideways — that is the same in Hess.
- **Restriction**: the 2-square step cannot go backward toward your own side. White cannot take a 2-square step downward; Black cannot take a 2-square step upward.
- This gives the Knight **6 landing squares** instead of the standard 8.
- Jumps over pieces like a standard Knight.

### Pawn
- Moves and captures exactly like a standard chess Pawn: 1 square forward (2 from the starting row on first move), captures 1 square diagonally forward.
- **Promotes** to a **Jester** upon reaching the enemy's last rank (row 8 for White, row 1 for Black).
- Can be swapped with the King using the King Swap ability.

### Jester — The Untouchable
- Moves and captures **diagonally forward only** (like a pawn's capture move).
- **Bounce defense**: if an enemy piece attempts to capture the Jester, the attacker bounces back to its original square — the capture does not happen.
- After a bounce, the **Jester's owner must immediately sacrifice** one of their own pieces (any friendly piece except the King and the Jester that just defended). The sacrificed piece is removed from the board.
- After the sacrifice is made, the attacker's turn resumes as normal.
- If two Jesters face each other, an attempted capture triggers the defending Jester's bounce.

---

## Winning the Game

There are two ways to win:

### 1. King Capture
Move any piece onto the square occupied by the opponent's King. The King is removed and the game ends immediately. There is no "check" warning — it is on both players to watch for threats.

### 2. Desperation Stale
At the start of your turn, if **all three** of the following are true, you **lose immediately**:

1. Your King is currently under attack by an enemy piece.
2. You have **0 King Swaps** remaining.
3. No friendly piece can move to block or capture the attacker, and your King has no safe escape square.

This is Hess's equivalent of checkmate — more brutal because there is no incremental pressure, just a sudden collapse when all escape routes are gone.

---

## Special Mechanic — King Swap

- Each player starts with **3 King Swaps**.
- On your turn, click "King Swap" in the sidebar, then tap any friendly Pawn.
- Your King teleports to the Pawn's square; the Pawn appears on the King's former square.
- The target square must not be under attack by any enemy piece.
- Uses one swap counter and ends your turn.
- Once all 3 are used, you lose the ability — and become vulnerable to Desperation Stale.

---

## Online Multiplayer

### How Rooms Work
- Game state lives on the server. Neither client can cheat by manipulating their local state.
- The server validates every action (whose turn it is, whether a move is legal, etc.) before applying it.
- Both clients receive the updated game state simultaneously via WebSocket after each action.

### Room Codes
- 6-character alphanumeric codes (e.g., `K7MQ2P`), no ambiguous characters (no 0/O or 1/I).
- Rooms are held in server memory. If the server restarts, active rooms are lost.
- Rooms are automatically cleaned up after 4 hours of inactivity.

### Disconnect Handling
- If your opponent closes their browser or loses connection, you see an "Opponent disconnected" banner.
- You can return to the lobby and start a new game.

---

## Technical Architecture

### Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS v4 + Framer Motion |
| Real-time | Socket.io (WebSocket + polling fallback) |
| Backend | Node.js + Express 5 + Socket.io Server |
| Monorepo | pnpm workspaces |
| Language | TypeScript 5 throughout |

### Project Structure
```
/
├── artifacts/
│   ├── hess/                   ← Frontend (React + Vite)
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── types.ts         ← Game types (Piece, Board, GameState...)
│   │       │   ├── engine.ts        ← All move generators + win conditions
│   │       │   └── useOnlineGame.ts ← Socket.io hook (game state + actions)
│   │       ├── pages/
│   │       │   ├── LobbyPage.tsx    ← Create/join room UI
│   │       │   └── GamePage.tsx     ← Main game board + sidebar
│   │       └── components/
│   │           ├── HessBoard.tsx         ← Board rendering
│   │           ├── PieceIcon.tsx         ← SVG piece icons
│   │           ├── RulebookDrawer.tsx    ← In-game rulebook
│   │           ├── WinScreen.tsx         ← End game overlay
│   │           └── JesterSacrificeOverlay.tsx
│   │
│   └── api-server/             ← Backend (Express + Socket.io)
│       └── src/
│           ├── game/
│           │   ├── rooms.ts         ← In-memory room & game state management
│           │   └── socketHandler.ts ← All socket event handlers
│           ├── app.ts               ← Express app
│           └── index.ts             ← HTTP server + Socket.io init
│
└── lib/
    └── hess-engine/            ← Shared game engine (used by server)
        └── src/
            ├── types.ts
            └── engine.ts
```

### Board Representation
- The board is a 1D array of 64 elements (index 0–63).
- `row = Math.floor(square / 8)`, `col = square % 8`
- Row 0 = Black's back rank (top of board), Row 7 = White's back rank (bottom).
- White territory = squares 32–63, Black territory = squares 0–31.

### Socket Events
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `create_room` | `{ playerName }` |
| Client → Server | `join_room` | `{ roomId, playerName }` |
| Client → Server | `setup_swap` | `{ sq1, sq2 }` |
| Client → Server | `confirm_setup` | *(none)* |
| Client → Server | `make_move` | `{ from, to }` |
| Client → Server | `king_swap` | `{ pawnSq }` |
| Client → Server | `sacrifice` | `{ sq }` |
| Server → Client | `room_created` | `{ roomId, color }` |
| Server → Client | `room_ready` | `{ roomId, gameState, players }` |
| Server → Client | `game_update` | `{ gameState }` |
| Server → Client | `opponent_disconnected` | `{ color }` |
| Server → Client | `error` | `{ message }` |

---

## Design Decisions

**No database** — game state is held in server memory per room. Hess is a fast-paced synchronous game; persistence across restarts is not needed.

**Engine runs on both client and server** — the server is the authority and applies all moves. The client runs the engine locally only to compute legal move highlights (the dots shown on the board when you tap a piece). This keeps the UI responsive without a round-trip for every click.

**No "check" alerts** — unlike standard chess, Hess has no check warning. You must watch the board yourself. This is intentional — it raises the stakes and rewards attentiveness.

**Jester sacrifice before bouncing** — the sacrifice happens immediately after the bounce, before the attacker takes their turn. The attacker's turn then resumes fresh.

**Rook offsets are raw 1D** — S±4 and S±6 can technically cross row boundaries (e.g., column 7 + 4 = column 3 of the next row). This is intentional — it gives the Rook unusual diagonal-feel jumps that are deliberately hard to track visually.

---

## Design Notes — Why These Rules?

- **Territorial Queen**: Forces players to use their Queen defensively. Most games see the Queen traded early in standard chess; here, she becomes a fortress anchor.
- **Missile Rook**: Fixed-offset jumping makes the Rook unpredictable and hard to mentally track — a piece that rewards calculation but punishes assumptions.
- **Staircase Bishop**: Slows the Bishop down compared to standard chess, makes it a methodical piece that rewards long-term planning.
- **T-Shape Knight**: Keeps the Knight's jump ability but removes its backward retreat, making it a committed attacker that is hard to pull back.
- **Jester**: Introduces a non-capture piece that forces the opponent to plan around something they can never directly remove. The sacrifice cost is the balance — the Jester is powerful but not free.
- **King Swap**: Gives each player a finite emergency escape valve. The tension of watching your swap count go from 3 to 2 to 1 to 0 is a major psychological element of the game.
- **Desperation Stale instead of Checkmate**: Removes the incremental check-dodging of standard chess. Games are decided by strategic collapse rather than slow encirclement.

---

*Built with React, TypeScript, Socket.io, and a lot of custom game design.*
