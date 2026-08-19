import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build is served by the Express server (single-server setup).
// In dev, `npm run dev` proxies /api to the backend for a smooth workflow.
//
// For the static GitHub Pages build we set VITE_STATIC=true and a base path
// matching the project site (https://<user>.github.io/Stemcellsprotocol/).
const isStatic = process.env.VITE_STATIC === 'true';

export default defineConfig({
  base: isStatic ? '/Stemcellsprotocol/' : '/',
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
