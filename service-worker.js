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

/* INSTALL - robust caching: fetch individual resources, skip failures */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);

      // Per ogni URL prova a fare fetch, controlla response.ok, poi cache.put
      const results = await Promise.allSettled(
        CACHE_URLS.map(async (url) => {
          try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (!resp || !resp.ok) {
              throw new Error(`Failed to fetch ${url} (status: ${resp ? resp.status : 'no-response'})`);
            }
            await cache.put(url, resp.clone());
            return { url, ok: true };
          } catch (err) {
            // Non rigettiamo l'intera install, ma ricordiamo l'errore
            return { url, ok: false, error: String(err) };
          }
        })
      );

      // Log dei fallimenti per debug
      const failed = results
        .map(r => (r.status === 'fulfilled' ? r.value : null))
        .filter(Boolean)
        .filter(r => r.ok === false);

      if (failed.length) {
        console.warn('Service Worker: alcune risorse non sono state memorizzate in cache:', failed);
      }

      // Forza il SW attivo subito
      self.skipWaiting();
    } catch (e) {
      // Cattura qualsiasi errore imprevisto per evitare Uncaught Promise
      console.error('Service Worker install failed:', e);
    }
  })());
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
          cache.put(event.request, responseClone).catch(err => {
            // Non fatale, logga solo
            console.warn('Cache put failed for', event.request.url, err);
          });
        });

        return response;
      }).catch(err => {
        // Rete non disponibile o fetch fallito: preferisci fallire silenziosamente o fornire fallback
        console.warn('Fetch failed for', event.request.url, err);
        throw err;
      });
    })
  );
});