It is a very common design trap to build a deep, elegant ruleset and then
accidentally overwhelm the player with a giant "wall of text" in the user
interface.

To solve this without cluttering the screen or overwhelming the player's
cognitive load, here is a highly effective, modern UI/UX Segmentation Strategy
to display the rulebook naturally in your game.

Approach 1: The Tabbed Rulebook (UI Layout)

Instead of one long scrolling page, split the Rulebook menu into three clean,
clickable tabs. This matches the exact structure we just designed:

  - Tab 1: Basic Rules (Setup, King Capture, and basic movement. Keep this
    extremely short—this is all they need to read before their first match.)
  - Tab 2: Advanced Situations (King Swaps, Desperation Stale, and the Two-King
    Countdown.)
  - Tab 3: Legendary Pieces (The Jester Lifecycle and the Queen Raid. This acts
    as a "codex" that players only open when they actually encounter these rare
    pieces in a match.)

Approach 2: Contextual "Piece Cards" (The Hold-to-Learn Upgrade)

Your setup screen already has a great instruction: "Hold any piece to learn how
it moves." You can turn this into your primary teaching tool:

  - When a player long-presses a piece (during setup or during a match), instead
    of showing a long paragraph, open a compact, beautifully designed "Piece
    Card" modal [2, 3].
  - The card should contain:
    1.  A 3x3 visual grid illustrating the movement vectors (e.g., showing the
        Staircase Bishop's zigzag or the Rook's 4/6 jumps).
    2.  A 1-to-2 sentence summary of its special trait (e.g., for the Knight:
        "Leaps forward/sideways 2+1. Can only drift backward using its final
        sideways hook.").

Approach 3: "Just-In-Time" Dynamic Alerts

Do not explain rare rules like the Queen Raid or the Jester Bounce-Back in the
main menus. Instead, let the game engine teach the player dynamically when they
occur:

  - The Queen Raid Alert: The moment a player is reduced to only their King and
    Queen, a small, glowing banner slides onto the screen: "QUEEN RAID
    UNLOCKED!" [2] Tapping it displays a simple, two-sentence explanation: "Your
    Queen can now cross the midfield line for a 5-move siege. After her 5th
    move, she will teleport back here."
  - The Jester Sacrifice Alert: The moment an enemy attacks your Jester, your
    existing prompt (WHITE must now choose a piece to sacrifice) is already
    doing the work! The player doesn't need to memorize the rule beforehand
    because the UI guides them through the decision when it actually happens on
    the board.

The Verdict

By hiding the complex, rare rules behind dynamic alerts and piece cards, your
in-game interface remains incredibly clean and lightweight. Players can learn
the basic chess moves in two minutes, and then discover the "legendary"
mechanics naturally while playing.

THE PHASE-BY-PHASE REPLIT UPDATE PLAN

Below is the step-by-step implementation plan designed specifically for you and
your Replit Agent to follow. It is broken down into precise, highly logical
phases to ensure that your local development works seamlessly, the game rules
are perfectly accurate, and the AI is fully functional.

PHASE 1: Core Engine Integration & Movement Fixes

Focus: Consolidating duplicate code and fixing the core movement rules.

Step 1.1: Unify the Engines

  - Task: Clean up duplicate files in the workspace.
  - Action: Locate the duplicate frontend files engine.ts and types.ts. Remove
    them completely from the frontend directory.
  - Refactor: Update all frontend imports (such as in useOnlineGame.ts) to
    reference the unified game engine located in the shared library
    lib/hess-engine [4].

Step 1.2: Correct the Missile Rook Movement

  - Task: Resolve the "Rook Bug" causing accidental diagonal moves.
  - Action: In lib/hess-engine/pieces.ts (or your rook movement file), rewrite
    the Rook's move validation.
  - Logic: Do not calculate moves using 1D index offsets (S ± 4, S ± 6). Convert
    the start and end coordinates into 2D grid coordinates (row and column).
    Verify that the move is strictly horizontal or vertical, and that the
    distance is exactly 4 or exactly 6 squares [1].

Step 1.3: Implement Knight Option C (The Drifting Retreat)

  - Task: Restrict the Knight's backward movement.
  - Action: In the Knight's move-generation method, filter out any moves where
    the primary 2-square step moves backward toward the player's starting rank
    (downward for White, upward for Black). Ensure the final 1-square
    perpendicular step is still allowed to move backward.

PHASE 2: Jester & State-Machine Implementations

Focus: Resolving freezes and fully implementing the Jester and King Swaps.

Step 2.1: Code Jester Diagonal Movement

  - Task: Write the movement validation for the Jester.
  - Action: Give the Jester a boolean state tracker isHeadingHome: true.
    Generate movement vectors that allow exactly 1 step diagonally forward
    relative to its current heading. When the Jester lands on its home rank,
    toggle isHeadingHome: false.

Step 2.2: Implement Jester Home-Rank Choices & Caps

  - Task: Prompt the user upon reaching the home rank.
  - Action: When the Jester reaches its home rank, halt the game turn and
    display a selection modal: "Keep Jester" or "Transform." Enforce your piece
    caps (max 1 Queen, 2 Rooks, etc.) in the transformation list.

Step 2.3: Prevent the Jester-Sacrifice Deadlock

  - Task: Handle the edge-case where a player cannot sacrifice any pieces.
  - Action: In the transition logic for JESTER_SACRIFICE, scan the defending
    player's active pieces. If they have 0 valid, non-King pieces to sacrifice,
    bypass the state completely, execute the capture, and proceed to the next
    turn normally.

PHASE 3: AI Search & Evaluation Upgrades

Focus: Fixing the Negamax desync, stopping move repetition, and teaching the AI
to defend pawns.

Step 3.1: Fix Negamax Turn Alternation

  - Task: Prevent AI search desynchronization.
  - Action: In your AI search algorithm (lib/ai/search.ts or similar), update
    the Negamax node evaluation. If a Jester Bounce-Back is simulated (meaning
    the Jester's owner retains their turn), do not invert the player perspective
    (color = -color) for the next search depth step [1].

Step 3.2: Implement the AI Repetition Penalty

  - Task: Stop Hess from shuffling Rooks and Kings endlessly.
  - Action: Maintain a simple queue of the last 4 board hashes. In the AI's move
    evaluation function, if a simulated move results in a board state present in
    this history queue, subtract a heavy penalty (e.g., -500 points) to force
    Hess to choose a different, progressive move.

Step 3.3: Configure Pawn Square Tables (PSTs)

  - Task: Teach the AI to value advanced pawns.
  - Action: Implement a positional grid multiplier for pawns in the AI
    evaluation file. Progressively increase a pawn's value as it advances closer
    to the promotion rank (e.g., Rank 2 = 100 points, Rank 6 = 350 points,
    Rank 7 = 600 points).

PHASE 4: Multiplayer Setup & Game-End Logic

Focus: Enforcing secret setups, implementing stalemate, and adding the Two-King
countdown.

Step 4.1: Enforce Hidden Setup

  - Task: Prevent setup configurations from leaking during placement.
  - Action: Modify the socket events during the starting phase. When a player
    swaps their pieces, do not broadcast the coordinate updates to the other
    player. Only broadcast ready: true. The server must hold both layouts
    privately and only reveal the complete board once both clients have clicked
    "Ready."

Step 4.2: Implement the Stalemate Game-End Check

  - Task: Prevent game hangs when a player is stalemated.
  - Action: Before transitioning the turn, check if the current player has 0
    legal moves, their King is not in check, and they have 0 friendly pawns to
    swap. If true, terminate the game loop immediately and declare a Draw
    (Stalemate).

Step 4.3: Implement the Two-King Countdown

  - Task: Prevent endless King-versus-King endgames.
  - Action: If only the two Kings remain on the board, initialize a 30-half-move
    counter. Decrement it with every turn. If it reaches 0 without a capture,
    declare a Draw (Insufficient Material).

PHASE 5: UI Enhancements & Unit Testing

Focus: Building the interactive sandbox and verifying system health.

Step 5.1: Create the Piece Academy UI

  - Task: Build the empty training board sandboxes.
  - Action: Create a menu for the "Piece Academy." For each piece, load a clean
    board with only that piece, highlight its movement vectors, and allow the
    player to move it freely to learn its trajectory.

Step 5.2: Write Core Engine Unit Tests

  - Task: Ensure the engine rules never break during future updates.
  - Action: Create an automated test file (e.g., tests/engine.test.ts). Write
    unit tests to verify:
      - The 2D orthogonal movement limit of the Missile Rook.
      - The "drifting retreat" limit of the T-Shape Knight.
      - The Jester's diagonal movement, bounce deflection, and home-rank
        transformation.
      - King Swaps out of check and blocked swaps into check.

This phase-by-phase plan gives you and the Replit Agent an incredibly precise,
logical path to take Hess to completion [1, 4]! Whenever you are ready to begin,
you can hand this document directly to your agent.
