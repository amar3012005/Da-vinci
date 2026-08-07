/* HIVE PWA service worker — minimal app-shell cache.
 * Goal: satisfy Chrome's installability criteria (a fetch handler + manifest)
 * and give the installed app an offline launch shell. We deliberately keep it
 * dumb and safe:
 *   • navigations  → network-first, fall back to cached shell when offline
 *   • static assets → network-first, cached only as an offline fallback
 *   • API calls (/api, /v1) → ALWAYS network, never cached (avoids serving
 *     stale memory/recall data)
 */
const CACHE = 'hive-shell-v5';
const SHELL = ['/', '/index.html', '/hivemind-manifest.json', '/hive-icon-192.png', '/hive-icon-512.png'];

function offlineResponse() {
  return new Response('HIVEMIND is temporarily offline.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

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
  // Caddy sends no Cache-Control on index.html, so this fetch() — issued by
  // the SW itself, independent of whatever cache-bypass flag the user's
  // reload gesture carried — can otherwise be satisfied straight from the
  // browser's HTTP cache without ever reaching the server. { cache: 'reload'
  // } forces a real conditional revalidation every time a page loads, so a
  // release is visible on the very next navigation, not just after clearing
  // site data.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'reload' })
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('/index.html')
          .then((r) => r || caches.match('/'))
          .then((r) => r || offlineResponse()))
    );
    return;
  }

  // Static assets are network-first so a release can never keep an old entry
  // bundle alive. The cache remains an offline fallback.
  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(request).then((r) => r || offlineResponse()))
  );
});
