
const CACHE_NAME = 'absolute-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://absolutecompany.co/app/imagenes/logo4.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache opened');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'ABSOLUTE Update', body: 'Nueva actualización de su pedido.' };
  
  const options = {
    body: data.body,
    icon: 'https://absolutecompany.co/app/imagenes/logo4.png',
    badge: 'https://absolutecompany.co/app/imagenes/logo4.png',
    vibrate: [100, 50, 100],
    data: {
      url: './#/orders'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
