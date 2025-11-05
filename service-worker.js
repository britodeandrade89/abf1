// Import Workbox from Google's CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

if (workbox) {
  console.log(`Workbox is loaded`);

  const OFFLINE_FALLBACK_PAGE = 'offline.html';
  const CACHE_NAME = 'abfit-cache-v4'; // Incremented version for cache update

  // --- Installation: Cache the offline fallback page ---
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[Service Worker] Caching offline fallback page');
        return cache.add(OFFLINE_FALLBACK_PAGE);
      })
    );
  });

  // --- Activation: Clean up old caches ---
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
      })
    );
    // Force the new service worker to take control immediately
    return self.clients.claim();
  });

  // Enable navigation preload if supported
  if (workbox.navigationPreload.isSupported()) {
    workbox.navigationPreload.enable();
  }

  // --- Precaching App Shell ---
  // These files are fundamental for the app to run. They will be cached on install.
  workbox.precaching.precacheAndRoute([
    { url: '/index.html', revision: null },
    { url: '/index.css', revision: null },
    { url: '/index.js', revision: null }, // Precaching the compiled JS file
    { url: '/manifest.json', revision: null },
    { url: 'https://i.ibb.co/L06f36R/logo-ab-fit-192.png', revision: null },
    { url: 'https://i.ibb.co/P9T5YQJ/logo-ab-fit-512.png', revision: null },
  ]);

  // --- Caching Strategies for Dynamic Requests ---

  // 1. Navigation (HTML pages) - Network First, falling back to offline page
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async ({ event }) => {
      try {
        // Use the preloaded response, if available
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          return preloadResponse;
        }
        // Try to fetch from the network
        return await fetch(event.request);
      } catch (error) {
        // If the network fails, serve the offline fallback page from cache
        console.log('[Service Worker] Fetch failed; returning offline page.');
        const cache = await caches.open(CACHE_NAME);
        return cache.match(OFFLINE_FALLBACK_PAGE);
      }
    }
  );

  // 2. CSS, JS, Workers - Stale While Revalidate
  // This strategy provides a fast response from the cache while updating it in the background.
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'asset-cache',
    })
  );

  // 3. Images - Cache First
  // Images are served from cache first. If not in cache, they're fetched from network and cached.
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [
        new workbox.expiration.Plugin({
          maxEntries: 60, // Max number of images to cache
          maxAgeSeconds: 30 * 24 * 60 * 60, // Cache images for 30 Days
        }),
      ],
    })
  );

  // 4. Weather API - Network First
  // Try to get the latest weather data, but fall back to the cached version if offline.
  workbox.routing.registerRoute(
    ({url}) => url.hostname === 'api.open-meteo.com',
    new workbox.strategies.NetworkFirst({
      cacheName: 'weather-cache',
      plugins: [
        new workbox.expiration.Plugin({
          maxEntries: 1, // Only cache the latest forecast
          maxAgeSeconds: 1 * 60 * 60, // Cache for 1 hour
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