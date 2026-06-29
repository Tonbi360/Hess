---
name: AI game flow
description: Server-side AI move computation flow for vs-AI games
---

In vs-AI games (`isAIGame: true` on Room):
- AI always plays BLACK; human always plays WHITE.
- Both setup phases are auto-confirmed server-side in `createAiRoom` (using two `confirmSetup` calls).
- After each valid human move, server checks if it's BLACK's turn and schedules AI move computation with `setTimeout(600ms)`.
- AI move computed by `aiManager.computeMove(state, difficulty)` → negamax at depth 1/2/3.
- After game ends, `triggerAiTraining` runs asynchronously via `setImmediate`.
- Rematch in AI game: single `request_rematch` from human immediately resets the room.
- Admin password defaults to `process.env.AI_ADMIN_PASSWORD ?? 'hess-admin'`.
- Data files stored at `artifacts/api-server/data/` (auto-created on first run).
