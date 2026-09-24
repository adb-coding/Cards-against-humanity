import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served under /cah/ on the shared Table Night site (see ../../netlify.toml).
export default defineConfig({
  base: '/cah/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/cah/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
