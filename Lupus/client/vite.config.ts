import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served under /lupus/ on the shared Table Night site (see ../../netlify.toml).
export default defineConfig({
  base: '/lupus/',
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      '/lupus/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
