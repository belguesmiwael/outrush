// Service worker minimal — active l'installabilité PWA (offline-first léger)
const CACHE = 'outrush-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  // Network-first pour le contenu frais ; pas de cache agressif (stock temps réel)
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
