const versionParam = new URL(self.location.href).searchParams.get('v') || '1';
const SHELL_CACHE = `climbset-shell-${versionParam}`;
const IMAGE_CACHE = `climbset-images-${versionParam}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
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
          .filter((key) => (key.startsWith('climbset-shell-') && key !== SHELL_CACHE) || (key.startsWith('climbset-images-') && key !== IMAGE_CACHE))
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isWallImage = url.pathname.includes('/storage/v1/object/public/walls/');

  if (isWallImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached)
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        if (request.url.startsWith(self.location.origin)) {
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
