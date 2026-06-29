---
name: AI engine architecture
description: hess-ai lib uses node:fs — requires node types; only usable server-side
---

`lib/hess-ai` uses `node:fs` and `node:path` in `replayBuffer.ts` and `weightsStore.ts`.

**Rule:** hess-ai lib must have `"types": ["node"]` in its tsconfig.json and `"@types/node": "catalog:"` in devDependencies.

**Why:** The lib performs file I/O for persisting weights and replay buffer. It is strictly server-side — never import from the frontend.

**How to apply:** If adding more Node.js APIs to hess-ai, ensure the tsconfig types array includes "node". If porting to a universal lib, extract file I/O into the server (aiManager.ts).
