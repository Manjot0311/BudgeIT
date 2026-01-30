const CACHE_VERSION = 'budgetit-v2.0';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/app.js',
  '/js/state.js',
  '/js/storage.js',
  '/js/router.js',
  '/js/views/home.js',
  '/js/views/expenses.js',
  '/js/views/budget.js',
  '/js/views/stats.js',
  '/js/views/onboarding.js',
  '/js/ui/settings-modal.js',
  '/js/ui/alert-modal.js',
  '/js/ui/toast.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn('Cache install partial:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_VERSION) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_VERSION).then(cache => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch(() => {
        return caches.match(request);
      });
    })
  );
});
