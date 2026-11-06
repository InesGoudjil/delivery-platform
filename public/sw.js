// CineSpace Zero-Cache Pass-Through Service Worker
// Enables standalone PWA installation criteria without caching any offline data or video streams.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch handler is required by Chromium's PWA installability heuristic.
// Pass all requests directly to the network without storing anything in CacheStorage.
self.addEventListener("fetch", (event) => {
  // Let the browser handle cross-origin or non-GET requests natively
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch((error) => {
      // Re-throw so standard browser network error handling kicks in
      throw error;
    })
  );
});
