/* Kırpıntı — çevrimdışı önbellek (service worker)
   Uygulama kabuğu önbelleğe alınır. Yeni sürüm için CACHE adını artırın. */
const CACHE = 'kirpinti-v2';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Önce önbellek, arka planda güncelle (stale-while-revalidate).
   Google Fonts gibi dış kaynaklar da önbelleğe alınır. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);

    const network = fetch(req)
      .then(res => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    if (hit) return hit;
    const res = await network;
    if (res) return res;
    return (await cache.match('./index.html')) || Response.error();
  })());
});