// Service worker — v3. Ne cache JAMAIS les pages ops/admin ni les routes API
// (toujours du réseau frais). Se met à jour immédiatement.
const CACHE = 'outrush-v3';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Purge les anciens caches
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => k !== CACHE ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Jamais de cache pour l'app dynamique : ops, admin, API, auth
  const noCache = url.pathname.startsWith('/ops') || url.pathname.startsWith('/admin')
    || url.pathname.startsWith('/api') || url.pathname.startsWith('/auth');
  if (e.request.method !== 'GET' || noCache) {
    return; // laisse passer au réseau, sans interception
  }
  // Réseau d'abord pour tout le reste
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
