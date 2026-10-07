/* AI Agent — service worker
   Code & pages: NETWORK-FIRST (so a new version arrives immediately).
   Icons/images: cache-first (fast, and still available offline).
*/
const CACHE = 'aiagent-shell-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './screenshots/phone.png',
  './screenshots/desktop.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touch AI provider / cross-origin calls.
  if (url.origin !== self.location.origin) return;

  const isCode = req.mode === 'navigate' || /\.(?:js|css|html|webmanifest)$/.test(url.pathname);

  if (isCode) {
    // Network-first: always try to get the newest code; fall back to cache offline.
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Static assets: cache-first.
  e.respondWith(caches.match(req).then((c) => c || fetch(req)));
});
