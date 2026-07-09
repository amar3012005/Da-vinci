/* HIVE PWA service worker — minimal app-shell cache.
 * Goal: satisfy Chrome's installability criteria (a fetch handler + manifest)
 * and give the installed app an offline launch shell. We deliberately keep it
 * dumb and safe:
 *   • navigations  → network-first, fall back to cached shell when offline
 *   • static assets → stale-while-revalidate
 *   • API calls (/api, /v1) → ALWAYS network, never cached (avoids serving
 *     stale memory/recall data)
 */
const CACHE = 'hive-shell-v2';
const SHELL = ['/', '/index.html', '/hivemind-manifest.json', '/hive-icon-192.png', '/hive-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin (API/CDN)

  // Never cache app/data APIs — always live.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/v1')) return;

  // SPA navigations → network-first, offline fallback to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html') || await caches.match('/');
          // respondWith must always receive a Response. A first offline visit
          // has no shell cached yet, so return a small valid offline response.
          return cached || new Response('Offline - reconnect and try again.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
