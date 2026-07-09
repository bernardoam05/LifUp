/* eslint-env serviceworker */
/**
 * LifUp PWA service worker.
 * - Navigations: network-first, falling back to the cached shell (offline support).
 * - Same-origin static assets (hashed bundles, fonts, icons): stale-while-revalidate.
 * Bump CACHE_VERSION to invalidate old caches on deploy.
 */

const CACHE_VERSION = 'lifup-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') { return; }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) { return; }

  // App navigations: try the network, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(request).then(cached => {
      const refresh = fetch(request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
