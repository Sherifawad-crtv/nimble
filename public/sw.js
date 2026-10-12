// Retired service worker. Earlier builds installed an app-shell worker; this version removes it
// from any device that still has it: it clears every cache, unregisters itself and reloads open
// windows so they load straight from the network.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) await caches.delete(name);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
    })(),
  );
});
