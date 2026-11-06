// Offline support. The build fills in BUILD and PRECACHE (see vite.config.ts).
// A new build gets a new cache, so a same-named image that changed is never served stale.
const BUILD = '__BUILD_ID__';
const PRECACHE = /*__PRECACHE__*/[];
const CACHE = `magnet-city-${BUILD}`;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('magnet-city-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

async function cached(request) {
  const cache = await caches.open(CACHE);
  // Module scripts arrive as CORS requests but were saved by a plain addAll, so Vary must not split them.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

// The page is always fresh when the network answers; a slow or dead link falls back to the saved copy.
async function page(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match('/');
  const live = fetch(request).then(response => { if (response.ok) void cache.put('/', response.clone()); return response; });
  if (!saved) return live;
  const late = new Promise(resolve => setTimeout(() => resolve(saved), 4000));
  return Promise.race([live.catch(() => saved), late]);
}

self.addEventListener('fetch', event => {
  const { request } = event, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') { event.respondWith(page(request)); return; }
  // Music, voices and films stream in byte ranges, which the Cache API cannot store.
  if (request.headers.has('range') || /^\/(video|audio\/(music|voices))\//.test(url.pathname)) return;
  event.respondWith(cached(request));
});
