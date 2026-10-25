/*
 * The classic version (v1) was retired in v2.5.0. This replaces its service worker on phones that had it:
 * it deletes what v1 stored (its app copy and recitations), removes itself, and sends any open v1 page to
 * the current game. Its stars were already folded into the first explorer by the current game.
 */
'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('lhq1-')).map((k) => caches.delete(k)));
      await self.registration.unregister();
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach((c) => c.navigate(new URL('../', self.registration.scope).href).catch(() => {}));
    })(),
  );
});
