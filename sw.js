// ===== START OF FILE: brushvault/sw.js ===== //
const CACHE_NAME = 'brush-commander-v1.0.5'; // Incremented version to force update
const CORE_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',

    // Core Libraries
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
    'https://cdn.jsdelivr.net/npm/streamsaver@2.0.6/StreamSaver.min.js',

    // App Logic Scripts
    './js/config.js',
    './js/domElements.js',
    './js/bplistParserManual.js',
    './js/db.js',
    './js/fileHandlers.js',
    './js/pwa.js',
    './js/main.js',

    // UI Scripts
    './js/ui/rendering.js',
    './js/ui/panels.js',
    './js/ui/mobileToggles.js',
    './js/ui/main.js', // This is also a UI script, so including it is fine

    // Handler Scripts
    './js/handlers/selectionHandlers.js',
    './js/handlers/brushActionHandlers.js',
    './js/handlers/navigationHandlers.js',
    './js/handlers/dataHandlers.js',
    './js/handlers/mobileActionHandlers.js',
    './js/handlers/systemHandlers.js',

    // Icons and Manifest
    './manifest.json', // It's good practice to cache the manifest
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './icons/icon-maskable-192x192.png',
    './icons/icon-maskable-512x512.png',
    './icons/simplified_white512.png'
];

const DYNAMIC_CACHE_NAME = 'brush-commander-dynamic-v1.0.5'; // Incremented version

self.addEventListener('install', event => {
    console.log('[Service Worker] Installing new version:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('[Service Worker] Precaching core assets:', CORE_ASSETS.length, 'files');
            // Using individual `add` calls can give more specific error messages if one fails
            return Promise.all(
                CORE_ASSETS.map(url => cache.add(new Request(url, {cache: 'reload'})).catch(err => {
                    console.error(`[Service Worker] Failed to cache: ${url}`, err);
                    // This allows the SW to install even if one optional resource (like a font) fails,
                    // but it will fail if a critical JS file is missing.
                }))
            );
        })
        .then(() => {
            console.log('[Service Worker] Core assets precached successfully.');
            return self.skipWaiting();
        })
        .catch(error => {
            console.error('[Service Worker] Core asset precaching failed:', error);
        })
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
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always go to the network for fonts to get the most up-to-date stylesheet for the user's browser.
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(async cache => {
                try {
                    const networkResponse = await fetch(event.request);
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                } catch (err) {
                    return await cache.match(event.request) || new Response(null, { status: 404 });
                }
            })
        );
        return;
    }
    
    // For other requests, use a cache-first strategy.
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Return cached response if found
            if (cachedResponse) {
                return cachedResponse;
            }
            // Otherwise, fetch from network
            return fetch(event.request).then(networkResponse => {
                // If the fetch is successful, clone it and cache it for future use.
                if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                    caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            });
        })
    );
});