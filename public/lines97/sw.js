// ── Service Worker — Lines 97 ──

const CACHE_NAME = '__CACHE_VERSION__';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/favicon.svg',
  './assets/icon.png'
];

// Install Event — cache core static assets
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

// Fetch Event — Cache-First for hashed assets, Network-First for HTML/navigation, Stale-while-revalidate for static assets
self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  
  // Hashed Vite assets (immutable) -> Cache-First
  const isHashedAsset = url.pathname.includes('/assets/') && 
                        !url.pathname.includes('/lines97/assets/') && 
                        !url.pathname.includes('/lines98/assets/');

  if (isHashedAsset) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

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
    return;
  }

  // Network-First for navigate (HTML document) requests
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, clonedResponse);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
    return;
  }

  // Stale-while-revalidate for other static assets
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
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
