// ── Lines 97 — PWA Service Worker ──

const CACHE_NAME = 'lines97-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './icon.png',
  './manifest.json',
  './js/main.js',
  './js/constants.js',
  './js/state.js',
  './js/sound.js',
  './js/logic.js',
  './js/render.js',
  './js/save.js',
  './js/hint.js',
  './js/haptics.js',
  './js/firebase.js'
];

// Install Event — cache static assets
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Event — cleanup old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Stale-while-revalidate caching strategy
self.addEventListener('fetch', (e) => {
  // Only handle HTTP/HTTPS GET requests (avoid caching POST or other request methods)
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in background and update cache
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clonedResponse);
          });
        }
        return networkResponse;
      });
    })
  );
});
