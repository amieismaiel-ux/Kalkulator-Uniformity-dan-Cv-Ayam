
const CACHE_NAME = "unicvden-pro-offline-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Pasang dan simpan fail utama aplikasi.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Aktifkan versi baharu dan bersihkan cache versi lama.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key =>
              key.startsWith("unicvden-pro-offline-") &&
              key !== CACHE_NAME
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Utamakan cache untuk navigasi dan fail aplikasi yang telah disimpan.
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Jangan mengendalikan permintaan domain luar.
  if (url.origin !== self.location.origin) return;

  // Halaman dibuka: cuba rangkaian dahulu, guna cache jika offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match("./index.html") ||
            Response.error()
          );
        })
    );
    return;
  }

  // Fail yang pernah dicache boleh dibuka tanpa internet.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
