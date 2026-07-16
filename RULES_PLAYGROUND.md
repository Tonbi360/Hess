
DOCUMENT 2: RULES PLAYGROUND & PIECE ACADEMY

This document serves as the UI/UX and functional specification for an
interactive sandbox and tutorial module. Because Hess introduces non-traditional
pieces and spatial rules, this interactive playground is designed to build
player intuition far more effectively than text-based instruction.

1. Core Architecture

The Rules Playground is independent of the standard rulebook. It is a
standalone, interactive training suite split into three core modules:

[RULES PLAYGROUND MENU]
 ├── 1. Piece Academy (Movement Sandboxes)
 ├── 2. Special Mechanics (Interactive Mini-Lessons)
 └── 3. The Guided Practice Match

2. Module 1: The Piece Academy

The Piece Academy presents a grid of all seven custom pieces. Tapping any piece
opens a clean, empty board containing only that piece.

A. King Academy

  - Initial State: King placed on e4.
  - Visual Aid: The adjacent 8 squares glow with yellow dots indicating legal
    movement.
  - Interaction: Tapping a glowing square slides the King 1 step in that
    direction.

B. Queen Academy

  - Initial State: Queen placed on d1. The golden midfield line is prominently
    drawn between Ranks 4 and 5.
  - Visual Aid: All straight and diagonal lanes within the lower half
    (Ranks 1–4) glow. No squares on Ranks 5–8 glow.
  - Interaction: Dragging the Queen highlights her paths. Attempting to drag her
    past the midfield line triggers a gentle red pulse on the border line and a
    text alert: "The Queen is a goalkeeper; she cannot cross the midfield line."

C. Missile Rook Academy

  - Initial State: Rook placed on d4.
  - Interaction Steps:
      - Step 1 (Jumping Rules): The exact intervals (d8, d2, h4, a4) glow.
        Intervening squares remain dark. An overlay message explains: "The
        Missile Rook ignores intervening pieces and jumps exactly 4 or 6
        squares."
      - Step 2 (Blockers): Friendly pawns are spawned on d5 and e4. The legal
        jump squares do not change. The Rook still jumps past them,
        demonstrating its "ghost" jump capability.
      - Step 3 (Obstacles): A friendly piece is spawned on d8 (the landing
        square). The d8 square stops glowing. The player sees that they cannot
        land on friendly pieces.
      - Step 4 (Captures): An enemy piece is spawned on d8. The d8 square glows
        red. The player captures it, and the enemy piece is removed.

D. Staircase Bishop Academy

  - Initial State: Bishop placed on e4.
  - Interaction Steps:
      - Step 1 (The Zigzag): Selecting the Bishop animates its paths. The board
        draws step-by-step, alternating vertical and horizontal movements (e.g.,
        e4 -> e5 -> d5 -> d6 -> c6).
      - Step 2 (Odd-Step Color Change): The player is prompted to click d5 (odd
        step). The Bishop slides e4 -> e5 -> d5 and stops. A message explains:
        "Stopping on an odd-numbered step changes the Bishop's square color."
      - Step 3 (Blocking): A friendly pawn is placed on d6. The path beyond d6
        stops glowing, demonstrating that friendly pieces block the staircase.

E. T-Shape Knight Academy

  - Initial State: Knight placed on e4.
  - Visual Aid: Forward and sideways T-shape moves glow.
  - Interaction (Drifting Retreat - Option C):
      - Jumps straight down to e2 (2 ranks backward) are grayed out.
      - Sideways paths to c4 and g4 glow. Tapping c4 slides the Knight. From c4,
        the backward hook to c3 glows.
      - An explanation overlay displays: "The T-Shape Knight cannot make its
        primary 2-square step backward, but can drift backward 1 rank using its
        final sideways hook."

F. Pawn Academy

  - Initial State: Pawns on d2 (starting rank) and e3 (advanced rank).
  - Visual Aid: d2 highlights both 1-step and 2-step options. e3 highlights only
    a 1-step option.
  - Capture Test: An enemy pawn is placed on f4. The diagonal capture from e3 to
    f4 glows red.

3. Module 2: Special Mechanics (Mini-Lessons)

These interactive lessons teach the unique rules that separate Hess from
traditional board games.

Lesson 1: Hidden Setup

  - Layout: The screen splits into two separate boards.
      - Left: Your board.
      - Right: A blurred, curtained opponent's board marked "Hidden."
  - Action: The player swaps two back pieces on the left board and taps Ready.
    An animation shows a padlock locking their side.
  - Reveal: The AI presses Ready. A dramatic "reveal curtain" animation plays,
    the blur fades from the right board, and the starting layouts are
    simultaneously revealed.

Lesson 2: King Swap

  - Initial State: King on e1, friendly pawns on c2, e2, and g2.
  - Action: All friendly pawns glow blue. Tapping the pawn on c2 triggers an
    animated rotation swapping the King and Pawn.
  - UI Update: The King Swap tracker visibly decrements: Swaps Remaining: 3
    \rightarrow 2.

Lesson 3: Queen Desperation Raid

  - Initial State: Only White King on c2 and White Queen on d4 remain.
  - Action: The Queen is now unlocked. The player drags her across the midfield
    line to d5 (Move 1/5).
  - The Squeeze: The player makes four more moves in enemy territory. A counter
    on the screen tracks: Raid Move: 1/5 \rightarrow 2/5 \rightarrow 3/5
    \rightarrow 4/5 \rightarrow 5/5.
  - The Snapback: Upon executing the 5th move, the Queen is automatically
    teleported back to her pre-raid "launchpad" square of d4.

Lesson 4: Jester Lifecycle Campaign

  - Step 1 (Promotion): Player moves a pawn from d7 to d8. It instantly
    transforms into a Jester (white diamond).
  - Step 2 (The Journey Home): The Jester's movement is restricted to diagonally
    downward. The player slides the Jester toward Rank 1.
  - Step 3 (Bounce-Back Sacrifice): An enemy Bishop on e5 attacks the Jester on
    c3. A modal pop-up appears: "Jester Deflected! Choose a piece to sacrifice."
      - The player selects a friendly Knight on g2. The Knight is removed.
      - The enemy Bishop is forcefully bounced back to its starting square on
        e5.
  - Step 4 (The Jester's Choice): The Jester reaches d1 (home rank). A selection
    wheel appears:
      - Option A: Transform into Queen (restores lost Queen).
      - Option B: Remain Jester (shuttle back to enemy side).
  - Step 5 (The Returning Pawn): The player chooses Remain Jester. The Jester
    turns around and heads back up. It reaches the enemy back rank and
    transforms into a Returning Pawn, which is captured or lost if it reaches
    the home rank again.

Lesson 5: Desperation Stale (Checkmate)

  - Board A (Defeat): King is placed on b8, attacked by a Rook on b1. Player
    has 0 Swaps, and no pieces can block or capture. The screen highlights the
    board and displays: "White loses by Desperation Stale."
  - Board B (Survival): Same board, but a friendly Bishop is placed on c2. The
    diagonal block square on b2 glows. The player blocks the rook check,
    displaying: "Threat blocked. White survives."

Lesson 6: Two-King Countdown

  - Initial State: Only the White King and Black King remain on the board.
  - Action: A countdown panel slides onto the UI: Kings Remaining: 30
    Half-Moves.
  - Interaction: The player makes a move. The counter decrements to 29. The
    player is prompted to make successive moves until it hits 0, triggering an
    automatic Draw screen.

4. Module 3: The Guided Onboarding Match

Once a player completes Modules 1 and 2, they are invited to play their first
Guided Match against an "Easy" Hess AI:

1.  Passive AI: The AI will play quietly to allow the player to experiment.
2.  Interactive Pauses: The first time a special mechanic is available on the
    board (e.g., your King is checked and you have a Pawn to swap, or a Pawn is
    about to reach the promotion rank), the game pauses.
3.  Tutorial Overlay: An arrow points to the mechanic on the board, displaying a
    brief instruction on how to execute the move. Once completed, the match
    resumes normally.

Plan to guide you and the Replit Agent through implementing these changes
step-by-step!
