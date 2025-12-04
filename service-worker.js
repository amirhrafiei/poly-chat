const CACHE_NAME = 'poly-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css', // Assuming you extract STYLES into a file
  '/app.js'     // Your main application script
  // Add paths to icons, fonts, etc.
];

// Installation: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch: Intercept network requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Try to find the request in the cache first
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Cache miss - fetch from network
        return fetch(event.request);
      })
  );
});