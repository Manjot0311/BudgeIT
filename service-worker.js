const CACHE_VERSION = 'budgetit-v2.1'; // ⬅️ CAMBIA SOLO QUI LA VERSIONE
const CACHE_NAME = CACHE_VERSION;

const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',

  // CSS
  '/css/main.css',

  // JS core
  '/js/app.js',
  '/js/state.js',
  '/js/storage.js',
  '/js/router.js',

  // Views
  '/js/views/home.js',
  '/js/views/expenses.js',
  '/js/views/budget.js',
  '/js/views/stats.js',
  '/js/views/onboarding.js',

  // UI
  '/js/ui/settings-modal.js',
  '/js/ui/alert-modal.js',
  '/js/ui/toast.js',

  // Icons
  '/icons/icon-192.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/icon-180.png',
  '/icons/shortcut-add.png'
];

/* INSTALL */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

/* ACTIVATE */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* FETCH */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache dinamico solo se valido
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return response;
      });
    })
  );
});
