const CACHE_NAME = "calendar-v1.36";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./js/html2pdf.bundle.min.js"
];

// Instalace: uloží soubory do cache
self.addEventListener("install", event => {
  console.log("[SW] Install event");
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Caching files:", FILES_TO_CACHE);
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Aktivace: smaže staré cache a notifikuje o nové verzi
self.addEventListener("activate", event => {
  console.log("[SW] Activate event");
  event.waitUntil(
    caches.keys().then(keys => {
      const deleteOldCaches = Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", key);
            // Notifikuj všechny klienty o nové verzi
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'NEW_VERSION_AVAILABLE',
                  message: 'Dostupná je nová verze aplikace!'
                });
              });
            });
            return caches.delete(key);
          }
        })
      );
      return deleteOldCaches;
    })
  );
  self.clients.claim();
});

// Fetch: obsluha požadavků
self.addEventListener("fetch", event => {
  console.log("[SW] Fetch:", event.request.url, "mode:", event.request.mode);

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        console.log("[SW] Serving from cache:", event.request.url);
        return cached;
      }

      return fetch(event.request).catch(() => {
        const url = new URL(event.request.url);

        // Fallback pro offline navigaci i no-cors
        if (
          event.request.mode === "navigate" ||
          url.pathname === "/" ||
          url.pathname.endsWith("index.html")
        ) {
          console.log("[SW] Offline fallback triggered");
          return caches.match("/index.html");
        }
      });
    })
  );
});


// puvodní obsah service-worker.js
/*const CACHE_NAME = "calendar";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Instalace: cache souborů
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Aktivace: vyčištění starých cache
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: obsluha požadavků
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // fallback pro offline navigaci
          if (event.request.mode === "navigate") {
            return caches.match("/") || caches.match("/index.html");
          }
        })
      );
    })
  );
});

*/