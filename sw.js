const CACHE_NAME = 'brush-commander-v1.0.4'; // Incremented version due to CDN change
const CORE_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './js/db.js',
    './js/ui.js',
    './js/bplistParserManual.js',
    './js/fileHandlers.js',
    './js/eventHandlers.js',
    './js/domElements.js',
    './js/config.js',
    './js/pwa.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
    // Switched to jsDelivr CDN for dexie-export-import
    'https://cdn.jsdelivr.net/npm/dexie-export-import@1.0.3/dist/dexie-export-import.min.js',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './icons/icon-maskable-192x192.png',
    './icons/icon-maskable-512x512.png',
    './icons/simplified_white512.png'
];

const DYNAMIC_CACHE_NAME = 'brush-commander-dynamic-v1.0.3'; // Incremented version

self.addEventListener('install', event => {
    console.log('[Service Worker] Installing new version:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Precaching core assets:', CORE_ASSETS);
            const requests = CORE_ASSETS.map(url => {
                return new Request(url, { cache: 'reload' });
            });
            return cache.addAll(requests)
                .then(() => console.log('[Service Worker] All core assets precached successfully for version:', CACHE_NAME))
                .catch(error => {
                    console.error('[Service Worker] Failed to precache one or more core assets for version:', CACHE_NAME, error);
                    // This error will cause the SW installation to fail if not caught.
                });
        })
        .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating new version:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    const isCoreAssetRequest = CORE_ASSETS.some(assetUrl => {
        // Handle cases where assetUrl might be a full CDN URL or a local path
        if (event.request.url === assetUrl) return true;
        if (assetUrl.startsWith('./') && event.request.url.endsWith(assetUrl.substring(1))) return true;
        return false;
    });

    if (isCoreAssetRequest) {
        event.respondWith(
            caches.match(event.request, { cacheName: CACHE_NAME }).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(fetchResponse => {
                    if (fetchResponse.ok) {
                        const clonedResponse = fetchResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
                    }
                    return fetchResponse;
                }).catch(err => {
                    console.error('[Service Worker] Fetch failed for core asset (and not in cache):', event.request.url, err);
                });
            })
        );
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const clonedResponse = response.clone();
                    caches.open(DYNAMIC_CACHE_NAME).then(cache => cache.put(event.request.url, clonedResponse));
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request, { cacheName: DYNAMIC_CACHE_NAME })
                    .then(response => response || caches.match('./index.html', { cacheName: CACHE_NAME }));
            })
        );
    } else {
        event.respondWith(
            caches.match(event.request, { cacheName: DYNAMIC_CACHE_NAME }).then(cachedResponse => {
                return cachedResponse || fetch(event.request).then(fetchResponse => {
                    if (fetchResponse.ok) {
                        const clonedResponse = fetchResponse.clone();
                        caches.open(DYNAMIC_CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
                    }
                    return fetchResponse;
                }).catch(() => {
                    // Optional: return a generic fallback for failed non-core assets
                });
            })
        );
    }
});

self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});