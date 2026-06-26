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
          // Version Lines97 SW
          const swPath97 = resolve(__dirname, 'dist/lines97/sw.js');
          let swContent97 = readFileSync(swPath97, 'utf8');
          const randomVersion97 = 'lines97-cache-' + Math.random().toString(36).substring(2, 15);
          swContent97 = swContent97.replace('__CACHE_VERSION__', randomVersion97);
          writeFileSync(swPath97, swContent97, 'utf8');
          console.log(`Successfully versioned Lines97 Service Worker cache: ${randomVersion97}`);

          // Version Lines98 SW
          const swPath98 = resolve(__dirname, 'dist/lines98/sw.js');
          let swContent98 = readFileSync(swPath98, 'utf8');
          const randomVersion98 = 'lines98-cache-' + Math.random().toString(36).substring(2, 15);
          swContent98 = swContent98.replace('__CACHE_VERSION__', randomVersion98);
          writeFileSync(swPath98, swContent98, 'utf8');
          console.log(`Successfully versioned Lines98 Service Worker cache: ${randomVersion98}`);
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
        lines98: resolve(__dirname, 'lines98/index.html'),
        aura: resolve(__dirname, 'aura/index.html'),
      },
    },
  },
});
