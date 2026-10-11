const CACHE_NAME = 'lyra-shell-v3';
const SHELL_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => {
        if (key.startsWith('lyra-shell-') && key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve(false);
      })))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/live' || url.pathname.startsWith('/live/')) return;

  // Always ask the network for the app document first. This prevents a stale
  // cached index.html from pointing at JavaScript bundles that no longer exist.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/index.html')) || new Response(
            'Lyra is offline. Please reconnect to the internet and reopen the app.',
            { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Static assets are network-first too, with cache as an offline fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && SHELL_ASSETS.includes(url.pathname)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || Response.error();
      })
  );
});
