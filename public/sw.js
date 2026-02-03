self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('climbset-shell-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon.png',
        '/apple-touch-icon.png',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('climbset-shell-') && key !== 'climbset-shell-v1')
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        if (request.url.startsWith(self.location.origin)) {
          caches.open('climbset-shell-v1').then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
