/* ═══════════════════════════════════════════════════
   EJC GINCANA — sw.js (Service Worker)
═══════════════════════════════════════════════════ */

const CACHE_NAME = 'ejc-gincana-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ─── INSTALL: cache static assets ───────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { mode: 'no-cors' })));
    })
  );
});

// ─── ACTIVATE: clean old caches ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── FETCH: cache-first for static, network-first for Firebase ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase sempre via rede (dados em tempo real)
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis.com/firebase')) {
    return; // deixa o browser fazer normalmente
  }

  // Estratégia: cache-first para assets estáticos
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
