import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served under /sh/ on the shared Table Night site (see ../../netlify.toml).
export default defineConfig({
  base: '/sh/',
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/sh/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
