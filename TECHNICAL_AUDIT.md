

DOCUMENT 1: HESS TECHNICAL AUDIT & BUG REPORT

This document compiles, categorizes, and organizes all outstanding technical
debt, security gaps, and game-engine issues identified during system profiling
and playtesting.

1. Must Fix Before Public Release

These critical defects impact core gameplay, secure room access, build pipeline
stability, and deployment. They must be resolved to prevent game freezes,
soft-locks, and opponent impersonation.

  - Reconnect-Token Exposure: The socket event room_ready broadcasts both
    players’ private reconnect tokens to everyone in the active room. This
    allows a player to capture their opponent's token from the network tab and
    easily impersonate them.
  - Unsafe Default Admin Password: The game's AI administration controls fall
    back to a hardcoded default password (hess-admin) if the environment
    variable AI_ADMIN_PASSWORD is left unset.
  - Windows Binary Overrides: The workspace configuration (pnpm-workspace.yaml)
    explicitly excludes Windows-specific esbuild and Rollup binaries, causing
    setup, installation, or builds to fail when running development environments
    on Windows machines.
  - Duplicate Game Engines: The server evaluates moves using lib/hess-engine,
    but the frontend maintains a duplicated local implementation of the engine
    and game types. This leads to code redundancy and architectural divergence.
  - Rules Divergence (Frontend vs. Server): Because of the duplicate engines,
    certain movements (such as far-rank Jester movement) differ between the
    client-side UI and the server-side validator. Consequently, valid movement
    highlights on the screen can disagree with authoritative server validation,
    causing rejected moves.
  - Jester-Sacrifice Deadlock (Soft-Lock): When a Jester is attacked and
    successfully deflected, the engine enters a JESTER_SACRIFICE state. If the
    Jester's owner has no eligible pieces left to sacrifice (e.g., only the King
    and the Jester remain), the UI forces them to select a piece, leaving the
    match permanently frozen with no way to progress.
  - Setup is Not Secret: Every individual starting setup swap is broadcast to
    the opponent's client in real-time, completely violating the game
    documentation which describes the starting rank arrangement as hidden and
    secret.
  - Local Frontend/API Connection Gap: The client-side application expects to
    find the socket server at /api/socket.io on its own origin. However, the
    local development setup (using Vite) lacks an API proxy to route these
    requests to a separately running backend API server.

2. Important Game & AI Correctness Issues

These logical errors directly impact the correctness of the custom rules, the
strength of the AI, and overall game stability during late-game scenarios.

  - Desperation Stale is Incomplete: The engine check for checkmate (Desperation
    Stale) only verifies if the King has escape squares or if the attacking
    piece can be captured. It completely overlooks the documented option to
    block a blockable vertical, horizontal, or diagonal attack.
  - AI Search Handles Jester Bounces Incorrectly: When a Jester Bounce-Back
    occurs, the Jester's owner is supposed to retain their turn. However, the
    AI's negamax/minimax search algorithm always switches sides on every depth
    step, desynchronizing the AI's internal evaluations.
  - No-Legal-Move State Can Stall AI Games: If the AI runs completely out of
    legal moves (such as in a stalemate position) but the engine has no active
    game-over state defined for it, the match freezes indefinitely on Black's
    turn.
  - Inaccurate AI "TD Learning" Label: The AI training scripts are labeled as
    using Temporal Difference (TD) learning, but they actually evaluate
    positions statically against the final terminal outcome, rather than
    updating states dynamically against true next-state TD targets.
  - Synchronous Self-Play Bottlenecks: Although the self-play training script
    yields CPU time between individual games, deep minimax searches still
    execute synchronously. This can consume massive server CPU cycles and cause
    lag in active multiplayer games.
  - Hidden AI Persistence Errors: File system operations for saving or loading
    training weights and replay data silently ignore errors, making it difficult
    to detect write failures or directory permission issues.
  - AI File Location Discrepancy: The compiled runtime resolves its persistence
    path to a repository-level data/ directory instead of the documented
    API-server data directory.
  - Non-Atomic AI Data Writes: If the server crashes or restarts during a
    training weight write, the target JSON file can easily be corrupted. Writes
    are not atomic.

3. Security, Validation, & Access Gaps

These issues represent gaps in API security, payload verification, and basic
access control.

  - No Real Authentication: Player identity is unauthenticated, relying entirely
    on a display name and a reconnect UUID stored in the browser's local
    storage.
  - Unauthenticated Socket Access: Clients can establish Socket.io connections
    to the server without any account or session verification beyond knowing the
    room token.
  - Open CORS Policy: Both Express and Socket.io are configured to accept
    connections from all origins, leaving the API vulnerable to cross-origin
    scripting.
  - Unvalidated Socket Payloads: Incoming socket payloads are cast directly to
    TypeScript types rather than being validated against strict schemas (such as
    Zod) at the API boundary.
  - Privileged AI Actions Lack Protection: Admin actions—such as starting
    self-play training, tuning weights, or clearing buffers—lack access
    throttling, secret requirements, or secure access controls.

4. Multiplayer & Room Behavior Issues

These items affect room lifecycle management and state persistence.

  - Inaccurate Room Cleanup Documentation: The documentation states that
    inactive rooms expire and clean up after four hours. However, the actual
    cleanup script removes rooms based on their absolute creation time, and only
    if they have zero active players.
  - In-Memory Room State: Active matches and room sessions are held entirely in
    server memory. If the server restarts or crashes, all active games are
    instantly lost.
  - Static Reconnect Credentials: Player reconnect credentials are long-lived
    for the entire duration of the room lifecycle and are never rotated or
    expired after a successful reconnect.

5. Build & Development Issues

These obstacles impact developer onboarding and cross-platform compilation.

  - Non-Portable API Dev Script: The API server's development script utilizes
    export NODE_ENV=development, which is a POSIX-specific shell command that
    fails on standard Windows command lines.
  - Single-Target Dev Script: The root-level development script only starts the
    frontend server. The API server must be run manually in a separate terminal,
    worsening the proxy configuration gap.
  - No Automated Test Suite: The repository lacks automated unit or integration
    tests for the unified game engine, room managers, socket networking, or AI
    search algorithms.

6. Unused, Duplicate, or Stale Code

These redundant files should be cleaned up to reduce project clutter and prevent
developer confusion.

  - useGameState.ts: An old, obsolete local pass-and-play game hook. The
    frontend now authoritatively uses useOnlineGame for matches.
  - Frontend engine.ts and types.ts: These files duplicate the rules engine
    rather than importing it from the shared library.
  - KING_SWAP_SELECT and kingSwapCtx: Modeled inside the state machine but
    completely bypassed by the authoritative online game flow.
  - JesterSacrificeContext.attackerFrom: A state variable that is recorded but
    never utilized during the resolution of a Jester sacrifice.
  - AiManager.trainOnBuffer: Fully implemented in the codebase but never wired
    to any socket events or UI actions.
  - Duplicate Self-Play Sockets: The useOnlineGame hook exposes self-play
    controls, but the SelfPlayPanel UI component opens and manages an entirely
    separate socket connection to run training matches.
  - api-client-react: Installed in the package dependencies and provided to the
    client build, but completely unused by the active application.
  - db: A database package containing Postgres/Drizzle dependencies exists in
    the repository, but contains no actual schemas, migrations, or active
    backend consumers.
  - mockup-sandbox: A separate Vite sandbox application is included in the pnpm
    workspace builds, but is not part of the active runtime.
  - scripts/src/hello.ts: Leftover starter boilerplate code.
  - Stale Documentation: replit.md still references pass-and-play features,
    despite the active application focusing entirely on online multiplayer and
    AI matches.

7. Lower-Priority Architecture Cleanup

  - React Query is initialized in the client-side bundle, but is completely
    unused.
  - The API client and contract layer add little value because the only HTTP API
    endpoint currently in use is a basic server health check.
  - The db database package is unnecessary bloat unless you plan to implement
    user registration, match history, or a global matchmaking leaderboard.



If so, let me know, and I will immediately output Document 2: The Rules
Playground & Piece Academy Design Doc.
