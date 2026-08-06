import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApp } from './backend/app';
import { initDB } from './backend/database/db';

async function startServer() {
  try {
    // Initialize Database Engine and Seed Data
    await initDB();
    console.log('Database initialized successfully.');

    const app = createApp();
    const PORT = 3000;

    // Attach Vite middleware in development mode
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use((req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next();
        }
        next();
      });
      const express = await import('express');
      app.use(express.default.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`==================================================`);
      console.log(` Police MDT System Server Running on Port ${PORT}`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
