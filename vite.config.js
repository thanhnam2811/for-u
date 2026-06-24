import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lines97: resolve(__dirname, 'lines97/index.html'),
        aura: resolve(__dirname, 'aura/index.html'),
      },
    },
  },
});
