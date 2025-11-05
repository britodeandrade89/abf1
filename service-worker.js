// Import Workbox from Google's CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

if (workbox) {
  console.log(`Workbox is loaded`);

  const OFFLINE_FALLBACK_PAGE = 'offline.html';
  const CACHE_NAME = 'abfit-cache-v5'; // Incremented version to force update

  // --- Installation: Take control immediately ---
  self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the new service worker to become active immediately.
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[Service Worker] Caching offline fallback page');
        return cache.add(OFFLINE_FALLBACK_PAGE);
      })
    );
  });

  // --- Activation: Clean up old caches and take control of clients ---
  self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => self.clients.claim()) // Take control of all open clients.
    );
  });

  // Enable navigation preload if supported
  if (workbox.navigationPreload.isSupported()) {
    workbox.navigationPreload.enable();
  }

  // --- Precaching App Shell (Manifest & Icons only) ---
  // Core app files (HTML, JS, CSS) are handled by runtime caching rules below.
  workbox.precaching.precacheAndRoute([
    { url: '/manifest.json', revision: null },
    { url: 'https://via.placeholder.com/192x192/991b1b/FFFFFF?text=AB', revision: null },
    { url: 'https://via.placeholder.com/512x512/991b1b/FFFFFF?text=AB', revision: null },
  ]);

  // --- Caching Strategies for Dynamic Requests ---

  // 1. Navigation (HTML pages) - Network First, falling back to offline page
  const networkFirstWithOfflineFallback = new workbox.strategies.NetworkFirst({
      cacheName: 'html-cache',
      plugins: [
          new workbox.cacheableResponse.Plugin({
              statuses: [0, 200], // Cache opaque responses for cross-origin resources
          }),
      ],
  });

  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async (args) => {
        try {
            // Use the preloaded response, if available
            const preloadResponse = await args.event.preloadResponse;
            if (preloadResponse) {
                return preloadResponse;
            }
            return await networkFirstWithOfflineFallback.handle(args);
        } catch (error) {
            console.log('[Service Worker] Fetch failed for navigation; returning offline page.');
            const cache = await caches.open(CACHE_NAME);
            return cache.match(OFFLINE_FALLBACK_PAGE);
        }
    }
  );

  // 2. CSS, JS, Workers - Network First
  // Prioritize getting the latest app logic and styles. Fallback to cache if offline.
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'worker',
    new workbox.strategies.NetworkFirst({
      cacheName: 'asset-cache',
    })
  );

  // 3. Images - Cache First
  // Images don't change often, so serve from cache for speed.
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [
        new workbox.expiration.Plugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // 4. Weather API - Network First
  // Get latest weather, but have a fallback.
  workbox.routing.registerRoute(
    ({url}) => url.hostname === 'api.open-meteo.com',
    new workbox.strategies.NetworkFirst({
      cacheName: 'weather-cache',
      plugins: [
        new workbox.expiration.Plugin({
          maxEntries: 1,
          maxAgeSeconds: 1 * 60 * 60, // 1 hour
        }),
      ],
    })
  );

} else {
  console.log(`Workbox didn't load`);
}

// Listener to immediately activate the new service worker
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});