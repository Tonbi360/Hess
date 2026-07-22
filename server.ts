import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import app from './server/app';
import { logger } from './server/lib/logger';
import { registerSocketHandlers } from './server/game/socketHandler';

async function startServer() {
  const PORT = 3000;

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    path: '/api/socket.io/',
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `Hess server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
