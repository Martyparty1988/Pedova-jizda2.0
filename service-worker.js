const CACHE_NAME = 'pedrova-jizda-cache-v6';
const assetsToCache = [
  './',
  'index.html',
  'manifest.json',
  'style.css',
  'game-core.js',
  'game-3d.js',
  'game-ui.js',
  'game-audio.js',
  'game-logic.js',
  'game-assets.js',
  'player.js',
  'environment.js',
  'gameObjectFactory.js',
  'icons/icon-512x512.png',
  'https://cdn.skypack.dev/three@0.132.2',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js',
  'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(assetsToCache))
      .catch(error => console.error('[SW] Chyba při cachování souborů:', error))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
