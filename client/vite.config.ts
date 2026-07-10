import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build is served by the Express server (single-server setup).
// In dev, `npm run dev` proxies /api to the backend for a smooth workflow.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
