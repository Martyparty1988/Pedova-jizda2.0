// Název cache - změňte pro invalidaci a novou instalaci
const CACHE_NAME = 'pedrova-jizda-cache-v4';
// Seznam všech souborů, které jsou potřeba pro offline běh
const assetsToCache = [
  './',
  'index.html',
  'manifest.json',
  'style.css',
  'main.js',
  'game-core.js',
  'game-3d.js',
  'game-ui.js',
  'game-audio.js',
  'game-logic.js',
  'game-assets.js',
  'icons/icon-512x512.png',
  'icons/icon-256x256.png',
  'icons/icon-192x192.png',
  'icons/icon-180x180.png',
  'icons/icon-32x32.png',
  'icons/icon-16x16.png',
  // Externí zdroje
  'https://cdn.skypack.dev/three@0.132.2',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js',
  'https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,700;1,400&family=Teko:wght@400;600&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Přednačítám soubory do cache.');
        return cache.addAll(assetsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Chyba při přednačítání souborů:', error);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Mažu starou cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(error => {
        console.warn('[Service Worker] Síťový požadavek selhal. Použije se cache, pokud je dostupná.', error);
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

