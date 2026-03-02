import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4300,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:4301',
        ws: true,
      },
    },
  },
});
