const CACHE_NAME = 'vaccine-pwa-v1';

const urlsToCache = [
    '/',
    '/checkin',
    '/admin/login',
    '/manifest.json',
    '/offline'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return cached response if found
            if (response) {
                return response;
            }

            // Clone request for fetch
            const fetchRequest = event.request.clone();

            return fetch(fetchRequest).then((response) => {
                // Check valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Cache new response (for next.js assets)
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.method === 'GET') {
                        cache.put(event.request, responseToCache);
                    }
                });

                return response;
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
