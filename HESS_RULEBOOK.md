Here is Document 3: The Complete Updated Hess Rulebook, compiled as a
professional, standardized rulebook document (HESS_RULEBOOK.md).

This document incorporates every rule change, the Jester diagonal mechanics, the
"Q-U-E-E-N" desperation raid, the physical King Capture logic, the corrected
T-Shape Knight retreat, and the mathematical definition of the Missile Rook.


DOCUMENT 3: THE OFFICIAL HESS RULEBOOK

Last Updated: July 2026

1. GAME SETUP & MODES

Hess supports both player-versus-player (online multiplayer) and
player-versus-AI (Hess) matches.

Game Modes

  - Vs Hess (AI): Choose difficulty (Easy, Normal, or Hard) and side (White,
    Black, or Random).
  - Player vs. Player: The room creator chooses White, Black, or Random. The
    joining player receives the opposite side.
  - Turn Order: White always moves first. If the human chooses Black, the Hess
    AI moves first.

The Hidden Setup Phase

Before the game begins, both sides prepare their starting layouts simultaneously
and in secret.

  - Back-Rank Customization: Only the eight back-rank pieces may be rearranged.
    Pawns are strictly locked to their starting ranks (Rank 2 for White, Rank 7
    for Black) and cannot be moved during setup.
  - Swapping: Players may swap the positions of any two friendly back-rank
    pieces.
  - The "Randomize" Option: Shuffles the eight back-rank pieces into a
    randomized, legal configuration. Hess also generates its starting rank using
    specialized layout archetypes.
  - The "Reset" Option: Restores the pieces to the standard Chess starting
    layout (Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook).
  - The Hidden Screen: Each player sees only their own board during
    customization. Neither player can see the opponent's pieces until both
    players click Ready, at which point both setups are revealed simultaneously,
    and play begins.

2. VICTORY & DRAW CONDITIONS

King Capture

The primary victory condition in Hess is the physical capture of the opponent's
King. If an opponent's King steps onto an attacked square, or if you can reach
the King with a legal move on your turn, capturing the King instantly wins the
game.

Desperation Stale (Checkmate)

A player loses the game at the start of their turn if all of the following
conditions are met:

1.  Their King is currently attacked (in check).
2.  They have 0 King Swaps remaining.
3.  The King has no safe, unattacked adjacent squares to escape to.
4.  No friendly piece can capture the attacking piece.
5.  No friendly piece can block the attack (if it is a blockable, multi-square
    attack).

Stalemate (Draw)

The game ends in an immediate Draw if a player meets all of the following
conditions on their turn:

1.  They have 0 legal moves remaining for any of their pieces.
2.  Their King is not currently under attack (not in check).
3.  They have 0 friendly pawns left on the board, making a King Swap impossible.

Two-King Draw

When only the two Kings remain on the board, the game enters a final countdown
state:

  - A 30-half-move countdown (15 turns for each player) begins immediately.
  - If either King is physically captured during this countdown, that capture
    ends the game normally.
  - If neither King is captured by the end of the 30th half-move, the match is
    declared an automatic Draw.

3. CORE PIECE RULES

King

  - Standard Movement: Walks exactly 1 square in any direction.
  - Entering Danger: The King is legally permitted to step onto attacked
    squares, including directly adjacent to the enemy King. However, doing so
    allows the opponent to physically capture the King on their next turn to
    win.
  - King Swaps (3 per game): A King Swap instantly exchanges the King's position
    with any friendly Pawn on the board.
      - Escaping Check: You may execute a King Swap to escape an attack. The
        Pawn teleports to the King's old square (acting as a "Bodyguard
        Sacrifice") and takes the hit.
      - Safety Restriction: You cannot swap into check. The destination square
        (where the Pawn currently stands) must not be attacked by any enemy
        piece at the moment of the swap.
      - Turn End: Executing a King Swap consumes your move and ends your turn.

Queen

  - Movement: Moves as a standard chess Queen (unlimited vertical, horizontal,
    and diagonal travel).
  - Goalkeeper Restriction: The Queen must remain on her owner's half of the
    board under normal circumstances (Ranks 1–4 for White, Ranks 5–8 for Black).
    She cannot cross the midfield line to move or capture.

Rook (Missile)

  - Movement: The Missile Rook is a long-range, orthogonal sniper. It must jump
    exactly 4 or exactly 6 squares vertically or horizontally from its starting
    square.
  - The "Ghost" Jump: It ignores all intervening pieces along its path.
  - Capture: It can only capture an enemy piece that is sitting on its exact
    landing square (square 4 or 6). It cannot capture or affect pieces it jumps
    over.
  - Obstacles: It cannot land on or capture friendly pieces.

Bishop (Staircase)

  - Movement: Moves in a fixed, alternating vertical and horizontal zigzag
    pattern.
  - Zigzag Rules: The Bishop can begin its movement with either a vertical or a
    horizontal step. Each zigzag path must maintain the same general diagonal
    direction (e.g., strictly up-and-right, or strictly down-and-left).
  - Range: It has unlimited range across a clear board and can stop on any
    square along its path. It can change its square color by stopping after an
    odd-numbered step (e.g., taking 1 vertical step).
  - Blocking: Friendly pieces block the path. It can capture an enemy piece
    sitting on any square along its zigzag path, which immediately ends its move
    on that square.

Knight (T-Shape)

  - Movement: Makes a 2-square primary step in one direction, and then
    a 1-square perpendicular step (sideways). It jumps over intervening pieces.
  - The "Drifting Retreat" Restriction (Option C):
      - The primary 2-square step cannot be backward (toward the player's own
        starting side). It can only be forward or sideways.
      - The final 1-square step is allowed to go backward. This allows the
        Knight to slowly drift backward and sideways when retreating, rather
        than leaping straight back in one bound.

Pawn

  - Movement: Moves 1 square straight forward. On its very first move of the
    game, it has the option to advance 2 squares straight forward instead.
  - Capture: Captures exactly 1 square diagonally forward.
  - Note: En Passant does not exist.
  - Promotion: Reaching the opponent's final rank instantly promotes the Pawn to
    a Jester.

4. SPECIAL RULES

The Q-U-E-E-N Desperation Raid

A Queen Raid becomes available only when a player has been reduced to exactly
their King and Queen.

  - Initiation: The Queen initiates a raid by crossing the midfield line into
    enemy territory.
  - The Anchor Square: The engine records the exact square the Queen occupied on
    her half of the board immediately before she crossed.
  - The 5-Move Limit: The Queen is permitted to make exactly 5 moves in enemy
    territory. She cannot cross back over to her own side of the board during
    these 5 turns.
  - The Snapback: After executing her 5th raid move, she is automatically
    teleported back to the recorded Anchor Square. If that square has been
    occupied, she is placed on the nearest empty square on her half of the
    board.
  - Limit: A player may perform only one Queen Raid per game. Capturing the
    enemy King during a raid immediately wins the game.

Jester (The Shuttle Trickster)

Direction & Movement

  - Upon promotion, a new Jester must travel back toward its owner’s home rank
    (Rank 1 for White, Rank 8 for Black).
  - It moves and captures exactly 1 diagonal square in its current direction of
    travel. It remains color-bound to the square color of its promotion.

The Bounce-Back Sacrifice

When an enemy piece attempts to capture a Jester, the Jester's owner is prompted
to make a choice:

1.  Sacrifice:
      - The Jester's owner chooses any other friendly piece on the board (except
        the King or the defending Jester itself) and removes it from the board.
      - The attacking enemy piece is forcefully "bounced back" to the square it
        occupied before initiating the capture. The Jester is saved, and the
        turn transitions normally.
2.  Decline:
      - The Jester is captured normally, the attacking piece occupies its
        square, and the turn transitions.

  - Note: If no eligible friendly pieces exist on the board to be sacrificed,
    the Jester is captured normally with no prompt.

Home-Rank Choice & Piece Caps

When the Jester successfully reaches its owner’s home rank, the player must
choose one of two options:

  - Keep Jester: The Jester reverses its travel direction and begins shuttling
    back toward the enemy rank.
  - Transform: The Jester permanently transforms into a Queen, Rook, Bishop, or
    Knight on that home square.
      - The Piece Cap: A transformation can only restore a captured piece up to
        your standard starting limits:
          - Queen: Max 1 living
          - Rook: Max 2 living
          - Bishop: Max 2 living
          - Knight: Max 2 living
      - Example: If you have 1 active Knight on the board but have lost your
        other Knight, you may transform your Jester into a replacement Knight.

The Returning Pawn Cycle

If a Jester that has been retained reaches the enemy's final rank for a second
time:

  - It instantly becomes a Returning Pawn, stuck on that rank.
  - It can only move by executing a diagonal capture toward its own home rank if
    an enemy piece is present.
  - After executing that diagonal capture, it begins moving straight forward
    toward its home rank as a normal returning Pawn.
  - If it successfully reaches its owner's home rank, it transforms into an
    enemy Pawn. Its original owner has lost control of the piece, and the
    opponent now controls it.

5. REQUIRED ENGINE STATE tracking

To run these rules authoritatively on the server, the game engine must track:

  - Active player turns, selected colors, and human/AI role assignments.
  - Private back-rank setups and individual readiness status.
  - Move histories for individual pawns (to validate first-move double steps).
  - Active King Swap counts (0–3 per player) and target-square safety checks.
  - Queen Raid status (unlocked, active, anchor square, and raid move
    count 0–5).
  - Jester travel direction (headingHome: true / false).
  - Jester bounce-back prompts and sacrifice resolutions.
  - Jester home-rank choice and active piece caps.
  - Returning Pawn states and ownership transitions.
  - The 30-half-move Two-King countdown tracker.

Plan to guide you and the Replit Agent through implementing these changes
step-by-step!
