// Service Worker for BRANDTRACE PWA
const CACHE_NAME = 'brandtrace-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Passthrough fetch handler to satisfy PWA criteria without aggressive offline breakage
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
