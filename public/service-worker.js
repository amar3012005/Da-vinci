const CACHE_NAME = 'foodles-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.jpeg',
  '/favicon.ico',
  '/static/js/main.js',
  '/static/css/main.css',
  '/images/alpha.jpeg',
  '/images/beta.jpeg',
  '/images/gamma.jpeg',
  '/images/delta.jpeg',
  '/images/pi.jpeg'
];

// Install service worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate service worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event strategy (Network first, falling back to cache)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response
        const responseClone = response.clone();
        
        // Open cache
        caches.open(CACHE_NAME)
          .then(cache => {
            // Add response to cache
            cache.put(event.request, responseClone);
          });
        return response;
      }).catch(() => caches.match(event.request))
  );
});
