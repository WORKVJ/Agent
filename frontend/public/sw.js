// AgentPulse Enterprise Field Tracking PWA Service Worker
const CACHE_NAME = 'agentpulse-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/agent',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// 1. Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-fatal pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Strategy:
// - API and WebSocket calls: Bypass cache or network-only
// - Static assets/pages: Stale-While-Revalidate with offline fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache for APIs, WebSockets, or POST/PUT mutations
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is HTML navigation, fallback to cached /agent or /
          if (event.request.mode === 'navigate') {
            return caches.match('/agent') || caches.match('/');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
