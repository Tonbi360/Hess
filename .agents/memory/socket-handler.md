---
name: Socket handler return pattern
description: noImplicitReturns makes return socket.emit() a TS error
---

The api-server tsconfig enables `noImplicitReturns`. Socket.io's `socket.emit()` returns a boolean.

**Rule:** Never use `return socket.emit(...)` in a socket event handler. Always split:
```typescript
socket.emit('error', { message: '...' });
return;
```

**Why:** `return socket.emit(...)` returns a boolean in that code path, while other paths return void. TypeScript error TS7030: "Not all code paths return a value."

**How to apply:** Any new socket handler that needs an early-exit guard must separate the emit from the return.
