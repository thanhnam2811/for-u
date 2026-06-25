import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import { writeFileSync, readFileSync } from 'fs';

export default defineConfig({
  base: '/for-u/',
  plugins: [
    tailwindcss(),
    {
      name: 'post-build-sw-versioning',
      closeBundle() {
        try {
          const swPath = resolve(__dirname, 'dist/lines97/sw.js');
          let swContent = readFileSync(swPath, 'utf8');
          const randomVersion = 'lines97-cache-' + Math.random().toString(36).substring(2, 15);
          swContent = swContent.replace('__CACHE_VERSION__', randomVersion);
          writeFileSync(swPath, swContent, 'utf8');
          console.log(`Successfully versioned Lines97 Service Worker cache: ${randomVersion}`);
        } catch (err) {
          console.error('Error during post-build SW versioning:', err);
        }
      }
    }
  ],
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
