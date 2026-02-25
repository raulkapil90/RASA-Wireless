// NUCLEAR SELF-DESTRUCT: This service worker unregisters itself and clears all caches.
// This ensures that stale cached JavaScript bundles are never served again.

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
            .then(() => self.clients.claim())
            .then(() => self.registration.unregister())
            .then(() => {
                // Force all controlled pages to reload with fresh code
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.navigate(client.url));
                });
            })
    );
});

// Pass all requests straight to network — no caching
self.addEventListener('fetch', () => { });
