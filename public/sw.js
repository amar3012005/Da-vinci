/* HIVE PWA service worker — minimal app-shell cache.
 * Goal: satisfy Chrome's installability criteria (a fetch handler + manifest)
 * and give the installed app an offline launch shell. We deliberately keep it
 * dumb and safe:
 *   • navigations  → network-first, fall back to cached shell when offline
 *   • static assets → network-first, cached only as an offline fallback
 *   • API calls (/api, /v1) → ALWAYS network, never cached (avoids serving
 *     stale memory/recall data)
 */
// Bump this when the worker contract changes so previously cached app shells
// cannot keep an old release alive after a deployment.
const CACHE = 'hive-shell-v3';
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
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Never prefer an old bundle when the network is available. Hashes normally
  // protect build assets, but cache-first still lets a stale worker mask a
  // release during route or chunk transitions.
  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(request))
  );
});
