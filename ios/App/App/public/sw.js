// Service Worker for PWA offline support
const CACHE_NAME = 'author-companion-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
];

// Install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        }),
    );
});

// Fetch
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }

            return fetch(event.request).then((response) => {
                // Don't cache non-GET requests or non-successful responses
                if (!event.request.method.includes('GET') || !response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        }),
    );
});

// Background Sync (for offline queue processing)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-queue') {
        event.waitUntil(syncQueue());
    }
});

async function syncQueue() {
    try {
        // Attempt to sync pending items
        console.log('Background sync triggered');
    } catch (error) {
        console.error('Sync error:', error);
    }
}
