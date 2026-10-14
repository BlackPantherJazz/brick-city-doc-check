import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app lives in /client. In dev, Vite runs on :5173 and forwards
// any /api request to the Express server on :3001, so the browser only
// ever talks to one address. In production, Express serves the built files.
export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    host: true, // lets you open the dev site from your phone on the same wifi
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
