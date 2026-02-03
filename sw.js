
const CACHE_NAME = 'absolute-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://absolutecompany.co/app/imagenes/logo4.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
